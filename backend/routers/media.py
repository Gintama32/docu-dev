from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from sqlalchemy.orm import Session
from typing import List
import os
import shutil

from .. import crud, schemas
from ..database import get_db
from .auth import get_current_active_user

# Protected routes (require authentication)
router = APIRouter(prefix="/api/media", tags=["media"], dependencies=[Depends(get_current_active_user)])

# Public routes (no authentication required)
public_router = APIRouter(prefix="/api/media", tags=["media"])


@router.get("", response_model=List[schemas.Media])
def list_media(db: Session = Depends(get_db)):
    return crud.list_media(db)


@router.post("/upload", response_model=schemas.Media)
async def upload_media(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Save to filesystem under backend/static/uploads
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    static_dir = os.path.join(base_dir, "static")
    upload_dir = os.path.join(static_dir, "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    original_name = os.path.splitext(os.path.basename(file.filename))[0]
    ext = os.path.splitext(file.filename)[1]
    safe_name = original_name.replace('/', '_').replace('\\', '_').replace('..', '_') or 'file'
    candidate = f"{safe_name}{ext}"
    file_path = os.path.join(upload_dir, candidate)
    counter = 1
    while os.path.exists(file_path):
        candidate = f"{safe_name}-{counter}{ext}"
        file_path = os.path.join(upload_dir, candidate)
        counter += 1

    with open(file_path, 'wb') as out:
        shutil.copyfileobj(file.file, out)

    relative = os.path.relpath(file_path, static_dir).replace(os.sep, '/')
    media_uri = f"/static/{relative}"

    media = crud.create_media(
        db,
        media_type=file.content_type,
        size_bytes=os.path.getsize(file_path),
        image_content=None,
        media_uri=media_uri,
    )
    return media


@router.delete("/{media_id}")
def delete_media(media_id: int, db: Session = Depends(get_db)):
    ok = crud.delete_media(db, media_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Media not found")
    return {"success": True}


@public_router.get("/{media_id}/raw")
def get_media_raw(media_id: int, db: Session = Depends(get_db)):
    media = crud.get_media(db, media_id)
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    # If binary stored, stream it; else attempt to serve from filesystem path
    if media.image_content:
        return Response(content=media.image_content, media_type=media.media_type or 'application/octet-stream')
    if media.media_uri and media.media_uri.startswith('/static/'):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        static_dir = os.path.join(base_dir, "static")
        file_path = os.path.join(static_dir, media.media_uri[len('/static/'):])
        if os.path.exists(file_path):
            with open(file_path, 'rb') as f:
                return Response(content=f.read(), media_type=media.media_type or 'application/octet-stream')
    raise HTTPException(status_code=404, detail="Media content missing")


