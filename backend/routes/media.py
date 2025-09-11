from flask import Blueprint, request, jsonify, send_file, current_app
from flask_login import login_required, current_user
import os
import json
from utils.media import save_uploaded_file, delete_file, get_file_type
from database import get_db_connection

media_bp = Blueprint("media", __name__)


@media_bp.route("/api/media/upload", methods=["POST"])
@login_required
def upload_media():
    """Upload a media file"""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    file_type = request.form.get("file_type", "image")
    entity_type = request.form.get("entity_type")  # 'project', 'profile', 'template'
    entity_id = request.form.get("entity_id")

    try:
        # Save file
        file_info = save_uploaded_file(file, file_type)
        if not file_info:
            return jsonify({"error": "Failed to save file"}), 400

        # Save to database
        conn = get_db_connection()
        cur = conn.cursor()

        # Insert media record
        cur.execute(
            """
            INSERT INTO media (filename, original_filename, file_type, mime_type, 
                             file_size, file_path, uploaded_by, metadata)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """,
            (
                file_info["filename"],
                file_info["original_filename"],
                file_info["file_type"],
                file_info["mime_type"],
                file_info["file_size"],
                file_info["file_path"],
                current_user.id,
                json.dumps(file_info.get("metadata", {})),
            ),
        )

        media_id = cur.fetchone()[0]

        # Associate with entity if provided
        if entity_type and entity_id:
            if entity_type == "project":
                cur.execute(
                    """
                    INSERT INTO project_media (project_id, media_id)
                    VALUES (%s, %s)
                """,
                    (entity_id, media_id),
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
            elif entity_type == "template":
                media_type = request.form.get("media_type", "logo")
                cur.execute(
                    """
                    INSERT INTO resume_template_media (template_name, media_id, media_type)
                    VALUES (%s, %s, %s)
                """,
                    (entity_id, media_id, media_type),
                )

        conn.commit()

        # Return media info
        media_info = {
            "id": media_id,
            "url": f"/api/media/{media_id}",
            "thumbnail_url": (
                f"/api/media/{media_id}/thumbnail"
                if file_info["file_type"] == "image"
                else None
            ),
            "filename": file_info["filename"],
            "original_filename": file_info["original_filename"],
            "file_type": file_info["file_type"],
            "mime_type": file_info["mime_type"],
            "file_size": file_info["file_size"],
            "metadata": file_info.get("metadata", {}),
        }

        return jsonify(media_info), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 400
    finally:
        if "conn" in locals():
            conn.close()


@media_bp.route("/api/media/<int:media_id>", methods=["GET"])
@login_required
def get_media(media_id):
    """Get media file"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT filename, original_filename, file_path, mime_type
            FROM media
            WHERE id = %s
        """,
            (media_id,),
        )

        media = cur.fetchone()
        if not media:
            return jsonify({"error": "Media not found"}), 404

        file_path = media[2]
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found"}), 404

        return send_file(
            file_path, mimetype=media[3], as_attachment=False, download_name=media[1]
        )

    finally:
        conn.close()


@media_bp.route("/api/media/<int:media_id>/thumbnail", methods=["GET"])
@login_required
def get_media_thumbnail(media_id):
    """Get media thumbnail (for images)"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT file_path, metadata
            FROM media
            WHERE id = %s AND file_type = 'image'
        """,
            (media_id,),
        )

        media = cur.fetchone()
        if not media:
            return jsonify({"error": "Media not found"}), 404

        metadata = media[1] or {}
        thumb_path = metadata.get("thumbnail")

        if not thumb_path or not os.path.exists(thumb_path):
            # Return original if no thumbnail
            return get_media(media_id)

        return send_file(thumb_path, mimetype="image/jpeg")

    finally:
        conn.close()


@media_bp.route("/api/media/<int:media_id>", methods=["DELETE"])
@login_required
def delete_media(media_id):
    """Delete media file"""
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Get file info
        cur.execute(
            """
            SELECT file_path, uploaded_by
            FROM media
            WHERE id = %s
        """,
            (media_id,),
        )

        media = cur.fetchone()
        if not media:
            return jsonify({"error": "Media not found"}), 404

        # Check permission (only uploader or admin can delete)
        if media[1] != current_user.id and not current_user.is_admin:
            return jsonify({"error": "Unauthorized"}), 403

        # Delete from filesystem
        delete_file(media[0])

        # Delete from database (cascades to junction tables)
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
            SELECT m.id, m.filename, m.original_filename, m.file_type, 
                   m.mime_type, m.file_size, m.metadata, pm.is_primary, pm.display_order
            FROM media m
            JOIN project_media pm ON m.id = pm.media_id
            WHERE pm.project_id = %s
            ORDER BY pm.display_order, m.id
        """,
            (project_id,),
        )

        media_list = []
        for row in cur.fetchall():
            media_list.append(
                {
                    "id": row[0],
                    "url": f"/api/media/{row[0]}",
                    "thumbnail_url": (
                        f"/api/media/{row[0]}/thumbnail" if row[3] == "image" else None
                    ),
                    "filename": row[1],
                    "original_filename": row[2],
                    "file_type": row[3],
                    "mime_type": row[4],
                    "file_size": row[5],
                    "metadata": row[6] or {},
                    "is_primary": row[7],
                    "display_order": row[8],
                }
            )

        return jsonify(media_list), 200

    finally:
        conn.close()
