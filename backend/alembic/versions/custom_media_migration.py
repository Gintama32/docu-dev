"""Add media support for Cloudinary and S3

Revision ID: custom_media_001
Revises: c81ca3584abe
Create Date: 2025-09-11 01:10:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "custom_media_001"
down_revision: Union[str, None] = "c81ca3584abe"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - handles existing media data."""
    # First, create the new association tables
    op.create_table(
        "profile_media",
        sa.Column("profile_id", sa.Integer(), nullable=False),
        sa.Column("media_id", sa.Integer(), nullable=False),
        sa.Column("media_type", sa.String(length=50), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(["media_id"], ["media.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["profile_id"], ["user_profiles.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("profile_id", "media_id", "media_type"),
    )

    op.create_table(
        "project_media",
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("media_id", sa.Integer(), nullable=False),
        sa.Column("media_type", sa.String(length=50), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=True),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["media_id"], ["media.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("project_id", "media_id"),
    )

    op.create_table(
        "resume_media",
        sa.Column("resume_id", sa.Integer(), nullable=False),
        sa.Column("media_id", sa.Integer(), nullable=False),
        sa.Column("media_type", sa.String(length=50), nullable=True),
        sa.Column("version", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["media_id"], ["media.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["resume_id"], ["resumes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("resume_id", "media_id"),
    )

    # Backup existing media data
    connection = op.get_bind()
    existing_media = connection.execute(
        sa.text("SELECT id, media_uri, media_type FROM media")
    ).fetchall()

    # Drop old columns
    op.drop_column("media", "size_bytes")
    op.drop_column("media", "media_type")
    op.drop_column("media", "created_at")
    op.drop_column("media", "updated_at")
    op.drop_column("media", "media_uri")
    op.drop_column("media", "image_content")

    # Add new columns with temporary defaults for existing rows
    op.add_column(
        "media", sa.Column("cloudinary_public_id", sa.String(length=255), nullable=True)
    )
    op.add_column("media", sa.Column("cloudinary_url", sa.Text(), nullable=True))
    op.add_column("media", sa.Column("preview_url", sa.Text(), nullable=True))
    op.add_column(
        "media", sa.Column("resource_type", sa.String(length=20), nullable=True)
    )
    op.add_column("media", sa.Column("format", sa.String(length=20), nullable=True))
    op.add_column("media", sa.Column("width", sa.Integer(), nullable=True))
    op.add_column("media", sa.Column("height", sa.Integer(), nullable=True))
    op.add_column("media", sa.Column("pages", sa.Integer(), nullable=True))
    op.add_column("media", sa.Column("bytes", sa.Integer(), nullable=True))
    op.add_column("media", sa.Column("uploaded_by", sa.Integer(), nullable=True))
    op.add_column("media", sa.Column("uploaded_at", sa.DateTime(), nullable=True))
    op.add_column("media", sa.Column("file_metadata", sa.JSON(), nullable=True))

    # Update existing rows with placeholder data
    for media in existing_media:
        media_id = media[0]
        media_uri = media[1]
        media_type = media[2]

        # Extract format from media_type or filename
        format_ext = "unknown"
        if media_type:
            format_ext = media_type.split("/")[-1] if "/" in media_type else "unknown"
        elif media_uri:
            format_ext = (
                media_uri.split(".")[-1].lower() if "." in media_uri else "unknown"
            )

        # Determine resource type
        resource_type = (
            "image" if format_ext in ["jpeg", "jpg", "png", "gif", "webp"] else "file"
        )

        connection.execute(
            sa.text(
                """
                UPDATE media 
                SET cloudinary_public_id = :public_id,
                    cloudinary_url = :url,
                    resource_type = :resource_type,
                    format = :format,
                    file_metadata = :metadata,
                    uploaded_at = CURRENT_TIMESTAMP
                WHERE id = :id
            """
            ),
            {
                "id": media_id,
                "public_id": f"legacy_local_{media_id}",
                "url": media_uri or f"/legacy/media/{media_id}",
                "resource_type": resource_type,
                "format": format_ext,
                "metadata": '{"migrated_from": "local_storage", "original_uri": "'
                + (media_uri or "")
                + '"}',
            },
        )

    # Now make the required columns non-nullable
    op.alter_column("media", "cloudinary_public_id", nullable=False)
    op.alter_column("media", "cloudinary_url", nullable=False)
    op.alter_column("media", "resource_type", nullable=False)

    # Add constraints
    op.create_unique_constraint(
        "uq_media_cloudinary_public_id", "media", ["cloudinary_public_id"]
    )
    op.create_foreign_key(
        "fk_media_uploaded_by", "media", "users", ["uploaded_by"], ["id"]
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop constraints
    op.drop_constraint("fk_media_uploaded_by", "media", type_="foreignkey")
    op.drop_constraint("uq_media_cloudinary_public_id", "media", type_="unique")

    # Add back old columns
    op.add_column(
        "media",
        sa.Column(
            "image_content", postgresql.BYTEA(), autoincrement=False, nullable=True
        ),
    )
    op.add_column(
        "media",
        sa.Column("media_uri", sa.VARCHAR(), autoincrement=False, nullable=True),
    )
    op.add_column(
        "media",
        sa.Column(
            "updated_at", postgresql.TIMESTAMP(), autoincrement=False, nullable=True
        ),
    )
    op.add_column(
        "media",
        sa.Column(
            "created_at", postgresql.TIMESTAMP(), autoincrement=False, nullable=True
        ),
    )
    op.add_column(
        "media",
        sa.Column("media_type", sa.VARCHAR(), autoincrement=False, nullable=True),
    )
    op.add_column(
        "media",
        sa.Column("size_bytes", sa.INTEGER(), autoincrement=False, nullable=True),
    )

    # Restore data from new columns if needed
    connection = op.get_bind()
    media_data = connection.execute(
        sa.text("SELECT id, cloudinary_url, format, file_metadata FROM media")
    ).fetchall()

    for media in media_data:
        media_id = media[0]
        url = media[1]
        format_ext = media[2]
        metadata = media[3]

        # Try to restore original URI from metadata
        original_uri = url
        if metadata and "original_uri" in metadata:
            original_uri = metadata.get("original_uri", url)

        # Reconstruct media_type
        media_type = f"image/{format_ext}" if format_ext else None

        connection.execute(
            sa.text(
                """
                UPDATE media 
                SET media_uri = :uri,
                    media_type = :type,
                    created_at = uploaded_at,
                    updated_at = uploaded_at
                WHERE id = :id
            """
            ),
            {"id": media_id, "uri": original_uri, "type": media_type},
        )

    # Drop new columns
    op.drop_column("media", "file_metadata")
    op.drop_column("media", "uploaded_at")
    op.drop_column("media", "uploaded_by")
    op.drop_column("media", "bytes")
    op.drop_column("media", "pages")
    op.drop_column("media", "height")
    op.drop_column("media", "width")
    op.drop_column("media", "format")
    op.drop_column("media", "resource_type")
    op.drop_column("media", "preview_url")
    op.drop_column("media", "cloudinary_url")
    op.drop_column("media", "cloudinary_public_id")

    # Drop association tables
    op.drop_table("resume_media")
    op.drop_table("project_media")
    op.drop_table("profile_media")
