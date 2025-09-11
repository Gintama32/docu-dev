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
    media_type: Optional[str] = Form("attachment"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Upload image to Cloudinary"""
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

        # Save to database
        db.execute(
            """
            INSERT INTO media (
                cloudinary_public_id, cloudinary_url, preview_url,
                resource_type, format, width, height, pages, bytes,
                uploaded_by, file_metadata
            ) VALUES (:public_id, :url, :preview_url, :resource_type, 
                     :format, :width, :height, :pages, :bytes, :user_id, :file_metadata)
        """,
            {
                "public_id": result.get("storage_id"),
                "url": result["url"],
                "preview_url": result.get("thumbnail_url"),
                "resource_type": "image",
                "format": result.get("format"),
                "width": result.get("width"),
                "height": result.get("height"),
                "pages": result.get("pages"),
                "bytes": result.get("bytes"),
                "user_id": current_user.id,
                "file_metadata": json.dumps(
                    {
                        "original_filename": file.filename,
                        "uploaded_at": datetime.utcnow().isoformat(),
                        "storage_type": result.get("storage_type"),
                    }
                ),
            },
        )

        media_id = db.execute("SELECT lastval()").scalar()

        # Associate with entity if provided
        if entity_type and entity_id:
            if entity_type == "project":
                db.execute(
                    """
                    INSERT INTO project_media (project_id, media_id, media_type)
                    VALUES (:project_id, :media_id, :media_type)
                """,
                    {
                        "project_id": entity_id,
                        "media_id": media_id,
                        "media_type": media_type,
                    },
                )
            elif entity_type == "profile":
                db.execute(
                    """
                    INSERT INTO profile_media (profile_id, media_id, media_type)
                    VALUES (:profile_id, :media_id, :media_type)
                """,
                    {
                        "profile_id": entity_id,
                        "media_id": media_id,
                        "media_type": media_type,
                    },
                )
            elif entity_type == "resume":
                db.execute(
                    """
                    INSERT INTO resume_media (resume_id, media_id, media_type)
                    VALUES (:resume_id, :media_id, :media_type)
                """,
                    {
                        "resume_id": entity_id,
                        "media_id": media_id,
                        "media_type": media_type,
                    },
                )

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
    # Get media info
    media = db.execute(
        """
        SELECT cloudinary_public_id, resource_type, uploaded_by, file_metadata
        FROM media
        WHERE id = :id
    """,
        {"id": media_id},
    ).fetchone()

    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Check permission
    if media["uploaded_by"] != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Delete image from Cloudinary
    deleted = storage_service.delete_image(media["cloudinary_public_id"])

    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete from storage")

    # Delete from database (cascades to associations)
    db.execute("DELETE FROM media WHERE id = :id", {"id": media_id})
    db.commit()

    return {"message": "Media deleted successfully"}


@router.get("/projects/{project_id}")
async def get_project_media(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> List[dict]:
    """Get all media for a project"""
    result = db.execute(
        """
        SELECT m.id, m.cloudinary_url, m.preview_url, m.resource_type,
               m.format, m.file_metadata, pm.media_type, pm.display_order, pm.caption
        FROM media m
        JOIN project_media pm ON m.id = pm.media_id
        WHERE pm.project_id = :project_id
        ORDER BY pm.display_order, m.id
    """,
        {"project_id": project_id},
    ).fetchall()

    media_list = []
    for row in result:
        # Handle file_metadata JSON deserialization
        file_metadata = row["file_metadata"] if isinstance(row["file_metadata"], dict) else (
            json.loads(row["file_metadata"]) if row["file_metadata"] else {}
        )
        
        media_item = {
            "id": row["id"],
            "url": row["cloudinary_url"],
            "preview_url": row["preview_url"],
            "resource_type": row["resource_type"],
            "format": row["format"],
            "file_metadata": file_metadata,
            "media_type": row["media_type"],
            "display_order": row["display_order"],
            "caption": row["caption"],
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
    result = db.execute(
        """
        SELECT m.id, m.cloudinary_url, m.preview_url, m.resource_type,
               m.format, m.file_metadata, pm.media_type, pm.is_primary
        FROM media m
        JOIN profile_media pm ON m.id = pm.media_id
        WHERE pm.profile_id = :profile_id
        ORDER BY pm.is_primary DESC, m.id
    """,
        {"profile_id": profile_id},
    ).fetchall()

    media_list = []
    for row in result:
        # Handle file_metadata JSON deserialization
        file_metadata = row["file_metadata"] if isinstance(row["file_metadata"], dict) else (
            json.loads(row["file_metadata"]) if row["file_metadata"] else {}
        )
        
        media_item = {
            "id": row["id"],
            "url": row["cloudinary_url"],
            "preview_url": row["preview_url"],
            "resource_type": row["resource_type"],
            "format": row["format"],
            "file_metadata": file_metadata,
            "media_type": row["media_type"],
            "is_primary": row["is_primary"],
        }
        media_list.append(media_item)

    return media_list


@router.get("/")
async def get_all_media(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> List[dict]:
    """Get all media for current user (for MediaPicker)"""
    result = db.execute(
        """
        SELECT id, cloudinary_public_id, cloudinary_url, preview_url, resource_type,
               format, file_metadata
        FROM media
        WHERE uploaded_by = :user_id
        ORDER BY uploaded_at DESC
    """,
        {"user_id": current_user.id},
    ).fetchall()

    media_list = []
    for row in result:
        # For compatibility with MediaPicker, add media_uri field
        # file_metadata might already be a dict (SQLAlchemy auto-deserializes JSON columns)
        file_metadata = row["file_metadata"] if isinstance(row["file_metadata"], dict) else (
            json.loads(row["file_metadata"]) if row["file_metadata"] else {}
        )
        original_filename = file_metadata.get("original_filename", f"media_{row['id']}")
        
        media_item = {
            "id": row["id"],
            "cloudinary_url": row["cloudinary_url"],
            "preview_url": row["preview_url"],
            "resource_type": row["resource_type"],
            "format": row["format"],
            "file_metadata": file_metadata,
            # Legacy compatibility fields
            "media_uri": row["cloudinary_url"],  # For MediaPicker compatibility
            "original_filename": original_filename,
        }
        media_list.append(media_item)

    return media_list


@router.get("/{media_id}/raw")
async def get_media_raw(
    media_id: int,
    db: Session = Depends(get_db),
):
    """Get media raw URL (redirect to Cloudinary URL) - public endpoint for image display"""
    media = db.execute(
        """
        SELECT cloudinary_url, resource_type, uploaded_by
        FROM media
        WHERE id = :id
    """,
        {"id": media_id},
    ).fetchone()

    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Public endpoint - no authentication required for viewing images
    # Cloudinary URLs are already public, so this is just a convenience redirect

    # Redirect to the actual media URL
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=media["cloudinary_url"], status_code=307)


