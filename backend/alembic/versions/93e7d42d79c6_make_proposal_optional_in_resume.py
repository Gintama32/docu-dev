"""make_proposal_optional_in_resume

Revision ID: 93e7d42d79c6
Revises: 20250807_01
Create Date: 2025-08-22 11:04:29.560903

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "93e7d42d79c6"
down_revision: Union[str, None] = "20250807_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Make project_proposal_id nullable in resumes table
    op.alter_column(
        "resumes", "project_proposal_id", existing_type=sa.Integer(), nullable=True
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Make project_proposal_id non-nullable again
    op.alter_column(
        "resumes", "project_proposal_id", existing_type=sa.Integer(), nullable=False
    )
