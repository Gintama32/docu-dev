from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
import json
from services.cloudinary_service import cloudinary_service
from database import get_db_connection
from datetime import datetime

media_bp = Blueprint("media", __name__)

ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
ALLOWED_PDF_EXTENSIONS = {"pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def allowed_file(filename, allowed_extensions):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed_extensions


@media_bp.route("/api/media/upload", methods=["POST"])
@login_required
def upload_media():
    """Upload image or PDF"""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    # Determine file type
    is_pdf = allowed_file(file.filename, ALLOWED_PDF_EXTENSIONS)
    is_image = allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS)

    if not is_pdf and not is_image:
        return jsonify({"error": "File type not allowed"}), 400

    try:
        # Upload to Cloudinary
        if is_pdf:
            result = cloudinary_service.upload_pdf(
                file, folder=f"pdfs/{current_user.id}"
            )
        else:
            result = cloudinary_service.upload_image(
                file, folder=f"images/{current_user.id}"
            )

        # Save to database
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            """
            INSERT INTO media (
                cloudinary_public_id, cloudinary_url, preview_url,
                resource_type, format, width, height, pages, bytes,
                uploaded_by, metadata
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """,
            (
                result["public_id"],
                result["url"],
                result.get("thumbnail_url") or result.get("preview_url"),
                result["resource_type"],
                result.get("format"),
                result.get("width"),
                result.get("height"),
                result.get("pages"),
                result.get("bytes"),
                current_user.id,
                json.dumps(
                    {
                        "original_filename": file.filename,
                        "uploaded_at": datetime.utcnow().isoformat(),
                    }
                ),
            ),
        )

        media_id = cur.fetchone()[0]
        conn.commit()

        # If entity association is provided
        entity_type = request.form.get("entity_type")
        entity_id = request.form.get("entity_id")

        if entity_type and entity_id:
            if entity_type == "project":
                media_type = request.form.get("media_type", "attachment")
                cur.execute(
                    """
                    INSERT INTO project_media (project_id, media_id, media_type)
                    VALUES (%s, %s, %s)
                """,
                    (entity_id, media_id, media_type),
                )
            elif entity_type == "profile":
                media_type = request.form.get("media_type", "avatar")
                cur.execute(
                    """
                    INSERT INTO profile_media (profile_id, media_id, media_type)
                    VALUES (%s, %s, %s)
                """,
                    (entity_id, media_id, media_type),
                )
            elif entity_type == "resume":
                cur.execute(
                    """
                    INSERT INTO resume_media (resume_id, media_id)
                    VALUES (%s, %s)
                """,
                    (entity_id, media_id),
                )

            conn.commit()

        return (
            jsonify(
                {
                    "id": media_id,
                    "url": result["url"],
                    "preview_url": result.get("thumbnail_url")
                    or result.get("preview_url"),
                    "resource_type": result["resource_type"],
                    "cloudinary_public_id": result["public_id"],
                }
            ),
            201,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if "conn" in locals():
            conn.close()


@media_bp.route("/api/media/<int:media_id>", methods=["DELETE"])
@login_required
def delete_media(media_id):
    """Delete media"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get media info
        cur.execute(
            """
            SELECT cloudinary_public_id, resource_type, uploaded_by
            FROM media
            WHERE id = %s
        """,
            (media_id,),
        )

        media = cur.fetchone()
        if not media:
            return jsonify({"error": "Media not found"}), 404

        # Check permission
        if media[2] != current_user.id and not current_user.is_admin:
            return jsonify({"error": "Unauthorized"}), 403

        # Delete from Cloudinary
        resource_type = "raw" if media[1] == "pdf" else "image"
        deleted = cloudinary_service.delete_asset(media[0], resource_type)

        if not deleted:
            return jsonify({"error": "Failed to delete from storage"}), 500

        # Delete from database (cascades to associations)
        cur.execute("DELETE FROM media WHERE id = %s", (media_id,))
        conn.commit()

        return jsonify({"message": "Media deleted successfully"}), 200

    finally:
        conn.close()


@media_bp.route("/api/projects/<int:project_id>/media", methods=["GET"])
@login_required
def get_project_media(project_id):
    """Get all media for a project"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT m.id, m.cloudinary_url, m.preview_url, m.resource_type,
                   m.format, m.metadata, pm.media_type, pm.display_order, pm.caption
            FROM media m
            JOIN project_media pm ON m.id = pm.media_id
            WHERE pm.project_id = %s
            ORDER BY pm.display_order, m.id
        """,
            (project_id,),
        )

        media_list = []
        for row in cur.fetchall():
            media_item = {
                "id": row[0],
                "url": row[1],
                "preview_url": row[2],
                "resource_type": row[3],
                "format": row[4],
                "metadata": row[5] or {},
                "media_type": row[6],
                "display_order": row[7],
                "caption": row[8],
            }
            media_list.append(media_item)

        return jsonify(media_list), 200

    finally:
        conn.close()


@media_bp.route("/api/profiles/<int:profile_id>/media", methods=["GET"])
@login_required
def get_profile_media(profile_id):
    """Get all media for a profile"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT m.id, m.cloudinary_url, m.preview_url, m.resource_type,
                   m.format, m.metadata, pm.media_type, pm.is_primary
            FROM media m
            JOIN profile_media pm ON m.id = pm.media_id
            WHERE pm.profile_id = %s
            ORDER BY pm.is_primary DESC, m.id
        """,
            (profile_id,),
        )

        media_list = []
        for row in cur.fetchall():
            media_item = {
                "id": row[0],
                "url": row[1],
                "preview_url": row[2],
                "resource_type": row[3],
                "format": row[4],
                "metadata": row[5] or {},
                "media_type": row[6],
                "is_primary": row[7],
            }
            media_list.append(media_item)

        return jsonify(media_list), 200

    finally:
        conn.close()
