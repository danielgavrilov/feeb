"""add_menu_section_id_to_base_prep

Revision ID: 18fc4b2e5a63
Revises: 983e46a3217b
Create Date: 2025-10-30 11:17:18.869910

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '18fc4b2e5a63'
down_revision: Union[str, None] = '983e46a3217b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add menu_section_id column to base_prep table
    op.add_column('base_prep', 
        sa.Column('menu_section_id', sa.Integer(), nullable=True)
    )
    op.create_foreign_key(
        'fk_base_prep_menu_section_id',
        'base_prep', 'menu_section',
        ['menu_section_id'], ['id'],
        ondelete='SET NULL'
    )
    
    # For existing base preps, try to assign them to the "Base Prep" section
    # This is a data migration to ensure existing data works correctly
    connection = op.get_bind()
    
    # Find all restaurants that have base preps
    restaurants_with_base_preps = connection.execute(
        sa.text("SELECT DISTINCT restaurant_id FROM base_prep WHERE menu_section_id IS NULL")
    ).fetchall()
    
    for (restaurant_id,) in restaurants_with_base_preps:
        # Find the "Base Prep" section for this restaurant
        result = connection.execute(
            sa.text("""
                SELECT ms.id 
                FROM menu_section ms
                JOIN menu m ON ms.menu_id = m.id
                WHERE m.restaurant_id = :restaurant_id 
                AND LOWER(TRIM(ms.name)) = 'base prep'
                LIMIT 1
            """),
            {"restaurant_id": restaurant_id}
        ).fetchone()
        
        if result:
            section_id = result[0]
            # Assign all base preps for this restaurant to the Base Prep section
            connection.execute(
                sa.text("""
                    UPDATE base_prep 
                    SET menu_section_id = :section_id 
                    WHERE restaurant_id = :restaurant_id 
                    AND menu_section_id IS NULL
                """),
                {"section_id": section_id, "restaurant_id": restaurant_id}
            )


def downgrade() -> None:
    # Remove the foreign key constraint
    op.drop_constraint('fk_base_prep_menu_section_id', 'base_prep', type_='foreignkey')
    # Remove the column
    op.drop_column('base_prep', 'menu_section_id')

