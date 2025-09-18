"""Add generated_content to project sheets

Revision ID: 0764dfead891
Revises: 6c7fd8779d33
Create Date: 2025-09-16 00:18:04.444336

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0764dfead891'
down_revision: Union[str, None] = '6c7fd8779d33'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add generated_content field and remove pdf_url field"""
    # Add generated_content field
    op.add_column('project_sheets', sa.Column('generated_content', sa.Text(), nullable=True))
    
    # Remove pdf_url field (if it exists)
    try:
        op.drop_column('project_sheets', 'pdf_url')
    except:
        # Column might not exist, ignore error
        pass


def downgrade() -> None:
    """Remove generated_content field and restore pdf_url field"""
    op.add_column('project_sheets', sa.Column('pdf_url', sa.String(500), nullable=True))
    op.drop_column('project_sheets', 'generated_content')
