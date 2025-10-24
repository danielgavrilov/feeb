"""update_allergen_badges_factual_labels

Revision ID: 215364f28133
Revises: ea066e9cba2d
Create Date: 2025-10-24 10:37:39.227408

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '215364f28133'
down_revision: Union[str, None] = 'ea066e9cba2d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Update allergen badges with factual labels
    badges_table = sa.table(
        "allergen_badge",
        sa.column("code", sa.String(length=100)),
        sa.column("name", sa.String(length=255)),
        sa.column("category", sa.String(length=50)),
        sa.column("keywords", sa.JSON()),
        sa.column("icon_svg", sa.Text()),
        sa.column("sort_order", sa.Integer()),
    )

    # Clear existing badges
    op.execute("DELETE FROM allergen_badge")

    # Insert new factual allergen badges
    op.bulk_insert(
        badges_table,
        [
            {
                "code": "wheat",
                "name": "Wheat",
                "category": "allergen",
                "keywords": ["wheat", "gluten", "durum wheat", "semolina", "farina", "flour", "bread"],
                "icon_svg": _wheat_icon(),
                "sort_order": 1,
            },
            {
                "code": "barley",
                "name": "Barley",
                "category": "allergen",
                "keywords": ["barley", "malt", "hordeum"],
                "icon_svg": _barley_icon(),
                "sort_order": 2,
            },
            {
                "code": "rye",
                "name": "Rye",
                "category": "allergen",
                "keywords": ["rye", "pumpernickel", "secale"],
                "icon_svg": _rye_icon(),
                "sort_order": 3,
            },
            {
                "code": "oats",
                "name": "Oats",
                "category": "allergen",
                "keywords": ["oats", "oatmeal", "rolled oats"],
                "icon_svg": _oats_icon(),
                "sort_order": 4,
            },
            {
                "code": "spelt",
                "name": "Spelt",
                "category": "allergen",
                "keywords": ["spelt", "dinkel", "spelt flour"],
                "icon_svg": _spelt_icon(),
                "sort_order": 5,
            },
            {
                "code": "triticale",
                "name": "Triticale",
                "category": "allergen",
                "keywords": ["triticale", "triticale flour"],
                "icon_svg": _triticale_icon(),
                "sort_order": 6,
            },
            {
                "code": "crustaceans",
                "name": "Crustaceans",
                "category": "allergen",
                "keywords": ["crustacean", "shrimp", "prawn", "crab", "lobster", "crayfish", "shellfish"],
                "icon_svg": _crustaceans_icon(),
                "sort_order": 7,
            },
            {
                "code": "eggs",
                "name": "Eggs",
                "category": "allergen",
                "keywords": ["egg", "eggs", "albumen", "meringue"],
                "icon_svg": _eggs_icon(),
                "sort_order": 8,
            },
            {
                "code": "fish",
                "name": "Fish",
                "category": "allergen",
                "keywords": ["fish", "salmon", "cod", "trout", "haddock", "tuna", "bass"],
                "icon_svg": _fish_icon(),
                "sort_order": 9,
            },
            {
                "code": "peanuts",
                "name": "Peanuts",
                "category": "allergen",
                "keywords": ["peanut", "peanuts", "groundnut", "groundnuts", "satay", "arachis"],
                "icon_svg": _peanuts_icon(),
                "sort_order": 10,
            },
            {
                "code": "soybeans",
                "name": "Soybeans",
                "category": "allergen",
                "keywords": ["soy", "soya", "soybean", "soybeans", "edamame", "tofu", "tempeh", "lecithin"],
                "icon_svg": _soybeans_icon(),
                "sort_order": 11,
            },
            {
                "code": "milk",
                "name": "Milk",
                "category": "allergen",
                "keywords": ["milk", "dairy", "lactose", "cheese", "butter", "cream", "yogurt"],
                "icon_svg": _milk_icon(),
                "sort_order": 12,
            },
            {
                "code": "tree_nuts",
                "name": "Tree nuts",
                "category": "allergen",
                "keywords": ["nut", "nuts", "almond", "almonds", "hazelnut", "hazelnuts", "walnut", "walnuts", "cashew", "cashews", "pecan", "pecans", "brazil nut", "brazil nuts", "pistachio", "pistachios", "macadamia", "macadamia nut"],
                "icon_svg": _tree_nuts_icon(),
                "sort_order": 13,
            },
            {
                "code": "celery",
                "name": "Celery",
                "category": "allergen",
                "keywords": ["celery", "celeriac", "apium"],
                "icon_svg": _celery_icon(),
                "sort_order": 14,
            },
            {
                "code": "mustard",
                "name": "Mustard",
                "category": "allergen",
                "keywords": ["mustard", "dijon", "wholegrain", "yellow mustard", "brown mustard"],
                "icon_svg": _mustard_icon(),
                "sort_order": 15,
            },
            {
                "code": "sesame",
                "name": "Sesame seeds",
                "category": "allergen",
                "keywords": ["sesame", "sesame seed", "sesame seeds", "tahini", "gomasio"],
                "icon_svg": _sesame_icon(),
                "sort_order": 16,
            },
            {
                "code": "sulphites",
                "name": "Sulphur dioxide & sulphites",
                "category": "allergen",
                "keywords": ["sulphite", "sulfite", "sulphites", "sulfites", "so2", "preservative", "e220", "e221", "e222", "e223", "e224", "e226", "e227", "e228"],
                "icon_svg": _sulphites_icon(),
                "sort_order": 17,
            },
            {
                "code": "lupin",
                "name": "Lupin",
                "category": "allergen",
                "keywords": ["lupin", "lupine", "lupini", "lupin flour"],
                "icon_svg": _lupin_icon(),
                "sort_order": 18,
            },
            {
                "code": "molluscs",
                "name": "Molluscs",
                "category": "allergen",
                "keywords": ["mollusc", "molluscs", "mussel", "mussels", "oyster", "oysters", "clam", "octopus", "squid", "scallop", "snail"],
                "icon_svg": _molluscs_icon(),
                "sort_order": 19,
            },
            {
                "code": "meat",
                "name": "Meat or animal derivative",
                "category": "allergen",
                "keywords": ["meat", "beef", "pork", "chicken", "lamb", "steak", "bacon", "ham", "sausage", "gelatin", "gelatine", "lard", "animal fat", "animal derivative"],
                "icon_svg": _meat_icon(),
                "sort_order": 20,
            },
            {
                "code": "honey",
                "name": "Honey",
                "category": "allergen",
                "keywords": ["honey", "bee honey", "raw honey"],
                "icon_svg": _honey_icon(),
                "sort_order": 21,
            },
        ],
    )


def downgrade() -> None:
    # Revert to previous allergen badge definitions
    badges_table = sa.table(
        "allergen_badge",
        sa.column("code", sa.String(length=100)),
        sa.column("name", sa.String(length=255)),
        sa.column("category", sa.String(length=50)),
        sa.column("keywords", sa.JSON()),
        sa.column("icon_svg", sa.Text()),
        sa.column("sort_order", sa.Integer()),
    )

    # Clear existing badges
    op.execute("DELETE FROM allergen_badge")

    # Revert to previous definitions (from e8d42f25c6a4_update_allergen_badges.py)
    op.bulk_insert(
        badges_table,
        [
            {
                "code": "cereals_gluten",
                "name": "Cereals containing gluten",
                "category": "allergen",
                "keywords": ["gluten", "wheat", "rye", "barley", "oats", "spelt", "triticale", "malt", "flour"],
                "icon_svg": _legacy_grain_icon(),
                "sort_order": 1,
            },
            {
                "code": "vegan",
                "name": "Not plant-based (vegan)",
                "category": "diet",
                "keywords": ["vegan", "plant-based", "plant based", "no animal"],
                "icon_svg": _vegan_icon(),
                "sort_order": 29,
            },
            {
                "code": "vegetarian",
                "name": "Not plant-based (vegetarian)",
                "category": "diet",
                "keywords": ["vegetarian", "ovo", "lacto", "contains meat"],
                "icon_svg": _vegetarian_icon(),
                "sort_order": 30,
            },
        ],
    )


# Icon helper functions (reusing from previous migration)
def _wheat_icon() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>"""

def _barley_icon() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>"""

def _rye_icon() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>"""

def _oats_icon() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>"""

def _spelt_icon() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>"""

def _triticale_icon() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>"""

def _crustaceans_icon() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>"""

def _eggs_icon() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>"""

def _fish_icon() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>"""

def _peanuts_icon() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>"""

def _soybeans_icon() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>"""

def _milk_icon() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>"""

def _tree_nuts_icon() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>"""

def _celery_icon() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>"""

def _mustard_icon() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>"""

def _sesame_icon() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>"""

def _sulphites_icon() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>"""

def _lupin_icon() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>"""

def _molluscs_icon() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>"""

def _meat_icon() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>"""

def _honey_icon() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>"""

def _legacy_grain_icon() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>"""

def _vegan_icon() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>"""

def _vegetarian_icon() -> str:
    return """<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>"""

