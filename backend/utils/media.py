import os
import uuid
from werkzeug.utils import secure_filename
from PIL import Image
import mimetypes

UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {
    "image": {"png", "jpg", "jpeg", "gif", "webp"},
    "pdf": {"pdf"},
    "document": {"doc", "docx", "txt"},
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def allowed_file(filename, file_type):
    """Check if file extension is allowed for the given file type"""
    return "." in filename and filename.rsplit(".", 1)[
        1
    ].lower() in ALLOWED_EXTENSIONS.get(file_type, set())


def get_file_type(filename):
    """Determine file type from extension"""
    ext = filename.rsplit(".", 1)[1].lower() if "." in filename else ""
    for file_type, extensions in ALLOWED_EXTENSIONS.items():
        if ext in extensions:
            return file_type
    return None


def generate_unique_filename(original_filename):
    """Generate unique filename to avoid collisions"""
    ext = (
        original_filename.rsplit(".", 1)[1].lower() if "." in original_filename else ""
    )
    unique_id = str(uuid.uuid4())
    return f"{unique_id}.{ext}" if ext else unique_id


def save_uploaded_file(file, file_type="image"):
    """Save uploaded file and return file info"""
    if not file or file.filename == "":
        return None

    # Validate file
    if not allowed_file(file.filename, file_type):
        raise ValueError(
            f"File type not allowed. Allowed types: {ALLOWED_EXTENSIONS[file_type]}"
        )

    # Check file size
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)

    if file_size > MAX_FILE_SIZE:
        raise ValueError(f"File too large. Maximum size: {MAX_FILE_SIZE/1024/1024}MB")

    # Generate unique filename
    original_filename = secure_filename(file.filename)
    unique_filename = generate_unique_filename(original_filename)

    # Create upload directory structure
    upload_dir = os.path.join(UPLOAD_FOLDER, file_type, unique_filename[:2])
    os.makedirs(upload_dir, exist_ok=True)

    # Save file
    file_path = os.path.join(upload_dir, unique_filename)
    file.save(file_path)

    # Get additional metadata
    metadata = {}
    mime_type = mimetypes.guess_type(original_filename)[0] or "application/octet-stream"

    # For images, get dimensions
    if file_type == "image":
        try:
            with Image.open(file_path) as img:
                metadata["width"] = img.width
                metadata["height"] = img.height

                # Create thumbnail
                thumb_size = (200, 200)
                img.thumbnail(thumb_size)
                thumb_filename = f"thumb_{unique_filename}"
                thumb_path = os.path.join(upload_dir, thumb_filename)
                img.save(thumb_path)
                metadata["thumbnail"] = thumb_path
        except Exception as e:
            print(f"Error processing image: {e}")

    return {
        "filename": unique_filename,
        "original_filename": original_filename,
        "file_type": file_type,
        "mime_type": mime_type,
        "file_size": file_size,
        "file_path": file_path,
        "metadata": metadata,
    }


def delete_file(file_path):
    """Delete file from filesystem"""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)

            # Also remove thumbnail if it exists
            dir_path = os.path.dirname(file_path)
            filename = os.path.basename(file_path)
            thumb_path = os.path.join(dir_path, f"thumb_{filename}")
            if os.path.exists(thumb_path):
                os.remove(thumb_path)

            return True
    except Exception as e:
        print(f"Error deleting file: {e}")
    return False
