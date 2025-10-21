"""add recipe ingredient substitutions table"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "1a2b3c4d5e67"
down_revision = "c3a9090d5a1b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "recipe_ingredient_substitution",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("recipe_ingredient_id", sa.Integer(), nullable=False, unique=True),
        sa.Column("alternative", sa.Text(), nullable=False),
        sa.Column("surcharge", sa.Text(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["recipe_ingredient_id"], ["recipe_ingredient.id"], ondelete="CASCADE"
        ),
    )


def downgrade() -> None:
    op.drop_table("recipe_ingredient_substitution")
