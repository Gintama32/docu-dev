from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Optional, List
import json
from datetime import datetime

from ..services.storage_service import storage_service
from ..database import get_db
from .auth import get_current_user
from .. import models

router = APIRouter(prefix="/api/media", tags=["media"])

ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def validate_file_extension(filename: str, allowed_extensions: set) -> bool:
    if "." not in filename:
        return False
    extension = filename.rsplit(".", 1)[1].lower()
    return extension in allowed_extensions


@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    entity_type: Optional[str] = Form(None),
    entity_id: Optional[int] = Form(None),
    media_type: Optional[str] = Form("general"),  # 'project', 'profile', 'general'
    attachment_type: Optional[str] = Form("attachment"),  # For association tables
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Upload image to Cloudinary with categorization"""
    # Validate file size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE/1024/1024}MB",
        )

    # Reset file position
    file.file.seek(0)

    # Validate image file type
    if not validate_file_extension(file.filename, ALLOWED_IMAGE_EXTENSIONS):
        raise HTTPException(status_code=400, detail="Only image files are allowed (PNG, JPG, JPEG, GIF, WEBP)")

    try:
        # Upload image to Cloudinary
        result = storage_service.upload_image(
            file.file, folder=f"images/{current_user.id}"
        )
        
        # Check for duplicates within the same media_type
        existing_media = db.query(models.Media).filter(
            models.Media.cloudinary_public_id == result.get("storage_id"),
            models.Media.media_type == media_type,
            models.Media.uploaded_by == current_user.id
        ).first()
        
        if existing_media:
            # Delete the uploaded image from Cloudinary since it's a duplicate
            storage_service.delete_image(result.get("storage_id"))
            raise HTTPException(
                status_code=409, 
                detail=f"This image already exists in your {media_type} media library"
            )

        # Save to database using ORM
        db_media = models.Media(
            cloudinary_public_id=result.get("storage_id"),
            cloudinary_url=result["url"],
            preview_url=result.get("thumbnail_url"),
            resource_type="image",
            format=result.get("format"),
            width=result.get("width"),
            height=result.get("height"),
            pages=result.get("pages"),
            bytes=result.get("bytes"),
            uploaded_by=current_user.id,
            media_type=media_type,  # 'project', 'profile', or 'general'
            file_metadata={
                "original_filename": file.filename,
                "uploaded_at": datetime.utcnow().isoformat(),
                "storage_type": result.get("storage_type"),
            }
        )
        db.add(db_media)
        db.flush()  # Get the ID without committing
        media_id = db_media.id

        # Associate with entity if provided using ORM
        if entity_type and entity_id:
            if entity_type == "project":
                db_project_media = models.ProjectMedia(
                    project_id=entity_id,
                    media_id=media_id,
                    media_type=attachment_type  # Use attachment_type for associations
                )
                db.add(db_project_media)
            elif entity_type == "profile":
                db_profile_media = models.ProfileMedia(
                    profile_id=entity_id,
                    media_id=media_id,
                    media_type=attachment_type  # Use attachment_type for associations
                )
                db.add(db_profile_media)
            elif entity_type == "resume":
                db_resume_media = models.ResumeMedia(
                    resume_id=entity_id,
                    media_id=media_id,
                    media_type=attachment_type  # Use attachment_type for associations
                )
                db.add(db_resume_media)

        db.commit()

        return {
            "id": media_id,
            "url": result["url"],
            "preview_url": result.get("thumbnail_url"),
            "resource_type": "image",
            "storage_id": result.get("storage_id"),
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{media_id}")
async def delete_media(
    media_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete media"""
    try:
        # Get media info using ORM
        media = db.query(models.Media).filter(models.Media.id == media_id).first()

        if not media:
            raise HTTPException(status_code=404, detail="Media not found")

        # Check permission
        if media.uploaded_by != current_user.id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Unauthorized")
            
        print(f"DEBUG: Attempting to delete media {media_id}, public_id: {media.cloudinary_public_id}")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG: Error accessing media {media_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error accessing media: {str(e)}")

    try:
        print(f"DEBUG: Clearing foreign key references for media {media_id}")
        
        # First, clear any main_image_id references to this media
        profile_updates = db.query(models.UserProfile).filter(
            models.UserProfile.main_image_id == media_id
        ).update({"main_image_id": None})
        print(f"DEBUG: Cleared {profile_updates} profile references")
        
        # Update projects that reference this media  
        project_updates = db.query(models.Project).filter(
            models.Project.main_image_id == media_id
        ).update({"main_image_id": None})
        print(f"DEBUG: Cleared {project_updates} project references")
        
        # Commit the reference clearing
        db.commit()
        print(f"DEBUG: Committed reference clearing")
        
        # Delete image from Cloudinary (non-blocking)
        print(f"DEBUG: Deleting from Cloudinary: {media.cloudinary_public_id}")
        try:
            deleted = storage_service.delete_image(media.cloudinary_public_id)
            if deleted:
                print(f"DEBUG: Cloudinary delete successful")
            else:
                print(f"DEBUG: Cloudinary delete failed, but continuing with database delete")
        except Exception as cloudinary_error:
            print(f"DEBUG: Cloudinary delete error: {cloudinary_error}, but continuing with database delete")

        # Delete from database using ORM (associations will cascade delete automatically)
        print(f"DEBUG: Deleting from database")
        db.delete(media)
        db.commit()
        print(f"DEBUG: Database delete successful")

        return {"message": "Media deleted successfully"}
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Log and handle unexpected errors
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete media: {str(e)}")


@router.get("/projects/{project_id}")
async def get_project_media(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> List[dict]:
    """Get all media for a project"""
    # Use ORM with proper joins
    project_media_query = db.query(
        models.Media,
        models.ProjectMedia.media_type,
        models.ProjectMedia.display_order,
        models.ProjectMedia.caption
    ).join(
        models.ProjectMedia, models.Media.id == models.ProjectMedia.media_id
    ).filter(
        models.ProjectMedia.project_id == project_id
    ).order_by(
        models.ProjectMedia.display_order.asc().nulls_last(),
        models.Media.id
    ).all()

    media_list = []
    for media, media_type, display_order, caption in project_media_query:
        media_item = {
            "id": media.id,
            "url": media.cloudinary_url,
            "preview_url": media.preview_url,
            "resource_type": media.resource_type,
            "format": media.format,
            "file_metadata": media.file_metadata or {},
            "media_type": media_type,
            "display_order": display_order,
            "caption": caption,
        }
        media_list.append(media_item)

    return media_list


@router.get("/profiles/{profile_id}")
async def get_profile_media(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> List[dict]:
    """Get all media for a profile"""
    # Use ORM with proper joins
    profile_media_query = db.query(
        models.Media,
        models.ProfileMedia.media_type,
        models.ProfileMedia.is_primary
    ).join(
        models.ProfileMedia, models.Media.id == models.ProfileMedia.media_id
    ).filter(
        models.ProfileMedia.profile_id == profile_id
    ).order_by(
        models.ProfileMedia.is_primary.desc(),
        models.Media.id
    ).all()

    media_list = []
    for media, media_type, is_primary in profile_media_query:
        media_item = {
            "id": media.id,
            "url": media.cloudinary_url,
            "preview_url": media.preview_url,
            "resource_type": media.resource_type,
            "format": media.format,
            "file_metadata": media.file_metadata or {},
            "media_type": media_type,
            "is_primary": is_primary,
        }
        media_list.append(media_item)

    return media_list


@router.get("/")
async def get_all_media(
    media_type: Optional[str] = None,  # Filter by 'project', 'profile', 'general', or None for all
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> List[dict]:
    """Get all media for current user (for MediaPicker) with optional filtering"""
    # Use ORM query with optional media_type filter
    query = db.query(models.Media).filter(
        models.Media.uploaded_by == current_user.id
    )
    
    if media_type:
        query = query.filter(models.Media.media_type == media_type)
    
    media_objects = query.order_by(models.Media.uploaded_at.desc()).all()

    media_list = []
    for media in media_objects:
        # For compatibility with MediaPicker, add media_uri field
        file_metadata = media.file_metadata or {}
        original_filename = file_metadata.get("original_filename", f"media_{media.id}")
        
        media_item = {
            "id": media.id,
            "cloudinary_url": media.cloudinary_url,
            "preview_url": media.preview_url,
            "resource_type": media.resource_type,
            "media_type": media.media_type,  # Include the new category
            "format": media.format,
            "file_metadata": file_metadata,
            "width": media.width,
            "height": media.height,
            # Legacy compatibility fields
            "media_uri": media.cloudinary_url,  # For MediaPicker compatibility
            "original_filename": original_filename,
        }
        media_list.append(media_item)

    return media_list


@router.get("/cloudinary/browse")
async def browse_cloudinary(
    folder: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Browse images in Cloudinary that aren't in our database yet"""
    try:
        import cloudinary.api
        
        # Get images from Cloudinary
        search_params = {
            'resource_type': 'image',
            'max_results': 50,
        }
        
        if folder:
            search_params['prefix'] = folder
            
        result = cloudinary.api.resources(**search_params)
        
        # Get existing public_ids from our database to filter out already imported images
        existing_public_ids = set()
        existing_media = db.query(models.Media.cloudinary_public_id).all()
        for media in existing_media:
            existing_public_ids.add(media[0])
        
        # Filter out images that are already in our database
        available_images = []
        for resource in result.get('resources', []):
            if resource['public_id'] not in existing_public_ids:
                available_images.append({
                    'public_id': resource['public_id'],
                    'url': resource['secure_url'],
                    'width': resource.get('width'),
                    'height': resource.get('height'),
                    'format': resource.get('format'),
                    'bytes': resource.get('bytes'),
                    'created_at': resource.get('created_at'),
                })
        
        return {
            'images': available_images,
            'total': len(available_images)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to browse Cloudinary: {str(e)}")


@router.post("/cloudinary/import")
async def import_from_cloudinary(
    public_id: str = Form(...),
    media_type: str = Form('general'),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Import an existing Cloudinary image into our database"""
    try:
        import cloudinary.api
        
        # Get image details from Cloudinary
        resource = cloudinary.api.resource(public_id)
        
        # Check if already exists in our database
        existing = db.query(models.Media).filter(
            models.Media.cloudinary_public_id == public_id
        ).first()
        
        if existing:
            raise HTTPException(status_code=409, detail="Image already imported")
        
        # Create media record in database
        db_media = models.Media(
            cloudinary_public_id=resource['public_id'],
            cloudinary_url=resource['secure_url'],
            preview_url=resource.get('secure_url'),  # Use same URL for preview
            resource_type="image",
            media_type=media_type,
            format=resource.get('format'),
            width=resource.get('width'),
            height=resource.get('height'),
            bytes=resource.get('bytes'),
            uploaded_by=current_user.id,
            file_metadata={
                'original_filename': resource['public_id'].split('/')[-1],
                'imported_at': datetime.utcnow().isoformat(),
                'storage_type': 'cloudinary',
                'imported_from': 'cloudinary_browse',
            }
        )
        db.add(db_media)
        db.commit()
        db.refresh(db_media)
        
        return {
            'id': db_media.id,
            'url': db_media.cloudinary_url,
            'public_id': db_media.cloudinary_public_id,
            'message': 'Image imported successfully'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to import image: {str(e)}")


@router.get("/{media_id}/raw")
async def get_media_raw(
    media_id: int,
    db: Session = Depends(get_db),
):
    """Get media raw URL (redirect to Cloudinary URL) - public endpoint for image display"""
    # Use ORM query
    media = db.query(models.Media).filter(models.Media.id == media_id).first()

    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Public endpoint - no authentication required for viewing images
    # Cloudinary URLs are already public, so this is just a convenience redirect

    # Redirect to the actual media URL
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=media.cloudinary_url, status_code=307)


