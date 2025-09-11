"""enhance_user_profile_with_comprehensive_fields

Revision ID: 736e42b0192f
Revises: 93e7d42d79c6
Create Date: 2025-08-23 11:15:39.053251

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "736e42b0192f"
down_revision: Union[str, None] = "93e7d42d79c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add new basic information columns to user_profiles
    op.add_column(
        "user_profiles", sa.Column("first_name", sa.String(100), nullable=True)
    )
    op.add_column(
        "user_profiles", sa.Column("last_name", sa.String(100), nullable=True)
    )
    op.add_column(
        "user_profiles", sa.Column("full_name", sa.String(200), nullable=True)
    )
    op.add_column(
        "user_profiles", sa.Column("current_title", sa.String(200), nullable=True)
    )

    # Add employment information columns
    op.add_column(
        "user_profiles", sa.Column("department", sa.String(100), nullable=True)
    )
    op.add_column(
        "user_profiles", sa.Column("employee_type", sa.String(50), nullable=True)
    )
    op.add_column(
        "user_profiles",
        sa.Column(
            "is_current_employee", sa.Boolean(), server_default="true", nullable=True
        ),
    )

    # Add contact information columns
    op.add_column("user_profiles", sa.Column("email", sa.String(255), nullable=True))
    op.add_column("user_profiles", sa.Column("mobile", sa.String(50), nullable=True))
    op.add_column("user_profiles", sa.Column("address", sa.String(500), nullable=True))
    op.add_column(
        "user_profiles", sa.Column("about_url", sa.String(500), nullable=True)
    )

    # Add JSON collections columns
    op.add_column(
        "user_profiles",
        sa.Column("certifications", sa.JSON(), server_default="[]", nullable=True),
    )
    op.add_column(
        "user_profiles",
        sa.Column("skills", sa.JSON(), server_default="[]", nullable=True),
    )
    op.add_column(
        "user_profiles",
        sa.Column("education", sa.JSON(), server_default="[]", nullable=True),
    )

    # Rename intro to professional_intro
    op.alter_column("user_profiles", "intro", new_column_name="professional_intro")

    # Create profile_experiences table
    op.create_table(
        "profile_experiences",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_profile_id",
            sa.Integer(),
            sa.ForeignKey("user_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("company_name", sa.String(200), nullable=True),
        sa.Column("position", sa.String(200), nullable=True),
        sa.Column("experience_start", sa.Date(), nullable=True),
        sa.Column("experience_end", sa.Date(), nullable=True),
        sa.Column("experience_detail", sa.Text(), nullable=True),
        sa.Column("is_current", sa.Boolean(), server_default="false", nullable=True),
        sa.Column("display_order", sa.Integer(), server_default="0", nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=True
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=True,
        ),
    )

    # Create indexes for performance
    op.create_index(
        "ix_profile_experiences_user_profile_id",
        "profile_experiences",
        ["user_profile_id"],
    )
    op.create_index(
        "ix_profile_experiences_display_order",
        "profile_experiences",
        ["user_profile_id", "display_order"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes
    op.drop_index("ix_profile_experiences_display_order")
    op.drop_index("ix_profile_experiences_user_profile_id")

    # Drop profile_experiences table
    op.drop_table("profile_experiences")

    # Rename professional_intro back to intro
    op.alter_column("user_profiles", "professional_intro", new_column_name="intro")

    # Drop JSON collections columns
    op.drop_column("user_profiles", "education")
    op.drop_column("user_profiles", "skills")
    op.drop_column("user_profiles", "certifications")

    # Drop contact information columns
    op.drop_column("user_profiles", "about_url")
    op.drop_column("user_profiles", "address")
    op.drop_column("user_profiles", "mobile")
    op.drop_column("user_profiles", "email")

    # Drop employment information columns
    op.drop_column("user_profiles", "is_current_employee")
    op.drop_column("user_profiles", "employee_type")
    op.drop_column("user_profiles", "department")

    # Drop basic information columns
    op.drop_column("user_profiles", "current_title")
    op.drop_column("user_profiles", "full_name")
    op.drop_column("user_profiles", "last_name")
    op.drop_column("user_profiles", "first_name")
