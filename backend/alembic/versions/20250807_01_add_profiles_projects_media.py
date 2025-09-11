"""Add media, user_profiles, projects, and resume.user_profile_id

Revision ID: 20250807_01
Revises: 41ce070845ae
Create Date: 2025-08-07 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20250807_01"
down_revision: Union[str, None] = "41ce070845ae"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    existing_tables = set(inspector.get_table_names())

    # Create media table if it does not exist
    if "media" not in existing_tables:
        op.create_table(
            "media",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("media_uri", sa.String(), nullable=True),
            sa.Column("media_type", sa.String(), nullable=True),
            sa.Column("image_content", sa.LargeBinary(), nullable=True),
            sa.Column("size_bytes", sa.Integer(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("now()"),
                nullable=True,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                server_default=sa.text("now()"),
                nullable=True,
            ),
            sa.PrimaryKeyConstraint("id"),
        )

    # Create user_profiles table if it does not exist
    if "user_profiles" not in existing_tables:
        op.create_table(
            "user_profiles",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("main_image_id", sa.Integer(), nullable=True),
            sa.Column("intro", sa.Text(), nullable=True),
            sa.Column("certificates", sa.JSON(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("now()"),
                nullable=True,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                server_default=sa.text("now()"),
                nullable=True,
            ),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(
                ["user_id"],
                ["users.id"],
            ),
            sa.ForeignKeyConstraint(
                ["main_image_id"],
                ["media.id"],
            ),
            sa.PrimaryKeyConstraint("id"),
        )

    # Create projects table if it does not exist
    if "projects" not in existing_tables:
        op.create_table(
            "projects",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("date", sa.Date(), nullable=True),
            sa.Column(
                "contract_value", sa.Numeric(precision=12, scale=2), nullable=True
            ),
            sa.Column("main_image_id", sa.Integer(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("now()"),
                nullable=True,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                server_default=sa.text("now()"),
                nullable=True,
            ),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(
                ["main_image_id"],
                ["media.id"],
            ),
            sa.PrimaryKeyConstraint("id"),
        )

    # Add user_profile_id column to resumes if missing
    if "resumes" in existing_tables:
        resume_columns = {c["name"] for c in inspector.get_columns("resumes")}
        if "user_profile_id" not in resume_columns:
            op.add_column(
                "resumes", sa.Column("user_profile_id", sa.Integer(), nullable=True)
            )
            op.create_foreign_key(
                None, "resumes", "user_profiles", ["user_profile_id"], ["id"]
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    # Drop FK and column from resumes if exists
    if "resumes" in existing_tables:
        resume_columns = {c["name"] for c in inspector.get_columns("resumes")}
        if "user_profile_id" in resume_columns:
            # Find FK name that references user_profiles
            for fk in inspector.get_foreign_keys("resumes"):
                if fk.get(
                    "referred_table"
                ) == "user_profiles" and "user_profile_id" in fk.get(
                    "constrained_columns", []
                ):
                    op.drop_constraint(fk["name"], "resumes", type_="foreignkey")
            op.drop_column("resumes", "user_profile_id")

    # Drop tables if they exist
    if "projects" in existing_tables:
        op.drop_table("projects")
    if "user_profiles" in existing_tables:
        op.drop_table("user_profiles")
    if "media" in existing_tables:
        op.drop_table("media")
