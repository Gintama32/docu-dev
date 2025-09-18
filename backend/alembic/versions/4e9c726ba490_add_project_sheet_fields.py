"""Add project sheet fields

Revision ID: 4e9c726ba490
Revises: 7ccfae525276
Create Date: 2025-09-15 13:11:17.465401

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4e9c726ba490'
down_revision: Union[str, None] = '7ccfae525276'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add project sheet fields to existing projects table"""
    # Add optional fields for project sheets
    op.add_column('projects', sa.Column('location', sa.String(255), nullable=True))
    op.add_column('projects', sa.Column('client_id', sa.Integer(), nullable=True))
    op.add_column('projects', sa.Column('contact_id', sa.Integer(), nullable=True))
    op.add_column('projects', sa.Column('project_details', sa.JSON(), nullable=True))
    
    # Add foreign key constraints
    op.create_foreign_key('fk_projects_client', 'projects', 'clients', ['client_id'], ['id'])
    op.create_foreign_key('fk_projects_contact', 'projects', 'contacts', ['contact_id'], ['id'])


def downgrade() -> None:
    """Remove project sheet fields"""
    op.drop_constraint('fk_projects_contact', 'projects', type_='foreignkey')
    op.drop_constraint('fk_projects_client', 'projects', type_='foreignkey')
    op.drop_column('projects', 'project_details')
    op.drop_column('projects', 'contact_id')
    op.drop_column('projects', 'client_id')
    op.drop_column('projects', 'location')
