"""remove_off_product_tables

Revision ID: b92d4e2c2aad
Revises: 7f15431e4426
Create Date: 2025-10-28 10:13:29.906021

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b92d4e2c2aad'
down_revision: Union[str, None] = '7f15431e4426'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove OFF data from ingredient and allergen tables
    op.execute("DELETE FROM ingredient_allergen WHERE source = 'off'")
    op.execute("DELETE FROM ingredient WHERE source = 'off'")
    op.execute("DELETE FROM allergen WHERE code LIKE 'en:%'")
    
    # Drop product-related tables (CASCADE handles foreign keys)
    op.execute("DROP TABLE IF EXISTS product_allergen CASCADE")
    op.execute("DROP TABLE IF EXISTS product_ingredient CASCADE")
    op.execute("DROP TABLE IF EXISTS product_nutrition CASCADE")
    op.execute("DROP TABLE IF EXISTS product CASCADE")


def downgrade() -> None:
    # Not implementing downgrade - this is intentional data removal
    pass

