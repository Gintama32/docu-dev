"""Add ProjectSheet model for document management

Revision ID: 6c7fd8779d33
Revises: 4e9c726ba490
Create Date: 2025-09-15 22:35:51.091232

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6c7fd8779d33'
down_revision: Union[str, None] = '4e9c726ba490'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add ProjectSheet model for document management"""
    op.create_table(
        'project_sheets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('generated_by', sa.Integer(), nullable=False),
        sa.Column('pdf_url', sa.String(500), nullable=True),
        sa.Column('template_data', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, default='generated'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['generated_by'], ['users.id']),
    )
    
    # Add index for better query performance
    op.create_index('idx_project_sheets_project', 'project_sheets', ['project_id'])
    op.create_index('idx_project_sheets_generated_by', 'project_sheets', ['generated_by'])


def downgrade() -> None:
    """Remove ProjectSheet model"""
    op.drop_index('idx_project_sheets_generated_by', 'project_sheets')
    op.drop_index('idx_project_sheets_project', 'project_sheets')
    op.drop_table('project_sheets')
