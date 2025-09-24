"""Add multiple description fields to projects

Revision ID: 132ef6a8f08d
Revises: 0764dfead891
Create Date: 2025-09-24 15:50:09.487925

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '132ef6a8f08d'
down_revision: Union[str, None] = '0764dfead891'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add multiple description fields to projects"""
    # Rename existing description to project_sheet_description
    op.alter_column('projects', 'description', new_column_name='project_sheet_description')
    
    # Add new description fields
    op.add_column('projects', sa.Column('project_sheet_description_brief', sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('resume_description', sa.Text(), nullable=True))


def downgrade() -> None:
    """Remove multiple description fields"""
    op.drop_column('projects', 'resume_description')
    op.drop_column('projects', 'project_sheet_description_brief')
    op.alter_column('projects', 'project_sheet_description', new_column_name='description')
