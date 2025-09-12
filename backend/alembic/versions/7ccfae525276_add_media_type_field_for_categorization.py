"""Add media_type field for categorization

Revision ID: 7ccfae525276
Revises: custom_media_001
Create Date: 2025-09-12 13:36:01.144426

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7ccfae525276'
down_revision: Union[str, None] = 'custom_media_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add media_type field for better categorization"""
    # Add media_type column
    op.add_column("media", sa.Column("media_type", sa.String(50), nullable=True))
    
    # Set default values for existing media based on associations
    connection = op.get_bind()
    
    # Set existing media to 'general' by default
    connection.execute(sa.text("""
        UPDATE media SET media_type = 'general' WHERE media_type IS NULL
    """))
    
    # Update media associated with projects to 'project'
    connection.execute(sa.text("""
        UPDATE media SET media_type = 'project' 
        WHERE id IN (SELECT media_id FROM project_media)
    """))
    
    # Update media associated with profiles to 'profile'  
    connection.execute(sa.text("""
        UPDATE media SET media_type = 'profile'
        WHERE id IN (SELECT media_id FROM profile_media)
    """))
    
    # Make the column non-nullable after setting defaults
    op.alter_column("media", "media_type", nullable=False)
    
    # Add index for better query performance
    op.create_index("idx_media_type", "media", ["media_type"])


def downgrade() -> None:
    """Remove media_type field"""
    op.drop_index("idx_media_type", "media")
    op.drop_column("media", "media_type")
