"""add allergen badges table"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "d4f6f1f5e9ac"
down_revision = "c3a9090d5a1b"
branch_labels = None
depends_on = None


def _hex_icon(top_color: str, bottom_color: str, inner: str) -> str:
    return f"""<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\">\n  <defs>\n    <linearGradient id=\"grad\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\">\n      <stop offset=\"0%\" stop-color=\"{top_color}\"/>\n      <stop offset=\"100%\" stop-color=\"{bottom_color}\"/>\n    </linearGradient>\n    <clipPath id=\"clip\">\n      <polygon points=\"32 0 60 16 60 48 32 64 4 48 4 16\"/>\n    </clipPath>\n  </defs>\n  <polygon points=\"32 0 60 16 60 48 32 64 4 48 4 16\" fill=\"url(#grad)\"/>\n  <g clip-path=\"url(#clip)\">\n{inner}\n  </g>\n</svg>"""


def upgrade() -> None:
    op.create_table(
        "allergen_badge",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False, server_default="allergen"),
        sa.Column("keywords", sa.JSON(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("icon_svg", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("code", name="uq_allergen_badge_code"),
    )
    op.create_index("ix_allergen_badge_code", "allergen_badge", ["code"], unique=True)

    badges_table = sa.table(
        "allergen_badge",
        sa.column("code", sa.String(length=100)),
        sa.column("name", sa.String(length=255)),
        sa.column("category", sa.String(length=50)),
        sa.column("keywords", sa.JSON()),
        sa.column("icon_svg", sa.Text()),
        sa.column("sort_order", sa.Integer()),
    )

    op.bulk_insert(
        badges_table,
        [
            {
                "code": "cereals_gluten",
                "name": "Cereals containing gluten",
                "category": "allergen",
                "keywords": [
                    "gluten",
                    "wheat",
                    "rye",
                    "barley",
                    "oats",
                    "spelt",
                    "triticale",
                    "malt",
                    "flour",
                ],
                "icon_svg": _hex_icon(
                    "#f4b942",
                    "#d97706",
                    "    <path d=\"M32 14v36\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <path d=\"M26 20c4 4 4 12 0 16 4 4 4 12 0 16\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <path d=\"M38 20c-4 4-4 12 0 16-4 4-4 12 0 16\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\"/>",
                ),
                "sort_order": 1,
            },
            {
                "code": "crustaceans",
                "name": "Crustaceans",
                "category": "allergen",
                "keywords": ["crustacean", "shrimp", "prawn", "crab", "lobster", "crayfish"],
                "icon_svg": _hex_icon(
                    "#fb7185",
                    "#be123c",
                    "    <path d=\"M21 28c0-6.5 5.5-12 12-12s12 5.5 12 12-5.5 12-12 12\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <path d=\"M23 36c3 3 7 5 10 5s7-2 10-5\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <path d=\"M21 28h6\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <path d=\"M37 28h6\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <circle cx=\"24\" cy=\"24\" r=\"2\" fill=\"#ffffff\"/>\n    <circle cx=\"40\" cy=\"24\" r=\"2\" fill=\"#ffffff\"/>",
                ),
                "sort_order": 2,
            },
            {
                "code": "eggs",
                "name": "Eggs",
                "category": "allergen",
                "keywords": ["egg", "eggs", "albumen", "meringue"],
                "icon_svg": _hex_icon(
                    "#f97316",
                    "#c2410c",
                    "    <path d=\"M32 16c-7 0-12 10-12 18s5 14 12 14 12-6 12-14-5-18-12-18Z\" fill=\"#ffffff\" opacity=\"0.85\"/>\n    <circle cx=\"32\" cy=\"34\" r=\"6\" fill=\"#facc15\"/>",
                ),
                "sort_order": 3,
            },
            {
                "code": "fish",
                "name": "Fish",
                "category": "allergen",
                "keywords": ["fish", "salmon", "cod", "trout", "haddock"],
                "icon_svg": _hex_icon(
                    "#38bdf8",
                    "#0369a1",
                    "    <path d=\"M20 32c4-6 9-10 12-10 8 0 16 6 16 10s-8 10-16 10c-3 0-8-4-12-10Z\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n    <path d=\"M20 32l-6-6v12l6-6Z\" fill=\"#ffffff\" opacity=\"0.9\"/>\n    <circle cx=\"34\" cy=\"30\" r=\"2\" fill=\"#ffffff\"/>",
                ),
                "sort_order": 4,
            },
            {
                "code": "peanuts",
                "name": "Peanuts",
                "category": "allergen",
                "keywords": ["peanut", "groundnut", "satay", "arachis"],
                "icon_svg": _hex_icon(
                    "#eab308",
                    "#b45309",
                    "    <path d=\"M26 22c-4 4-4 10 0 14s4 10 0 14c4 4 10 4 14 0 4-4 4-10 0-14s-4-10 0-14c-4-4-10-4-14 0Z\" fill=\"#fef3c7\"/>\n    <path d=\"M32 22c-2 4-2 8 0 12s2 8 0 12\" fill=\"none\" stroke=\"#f59e0b\" stroke-width=\"3\" stroke-linecap=\"round\"/>",
                ),
                "sort_order": 5,
            },
            {
                "code": "soybeans",
                "name": "Soybeans",
                "category": "allergen",
                "keywords": ["soy", "soya", "soybean", "edamame", "tofu", "tempeh", "lecithin"],
                "icon_svg": _hex_icon(
                    "#84cc16",
                    "#4d7c0f",
                    "    <path d=\"M20 36c4-8 12-14 24-16-2 10-8 18-16 22-4 2-6 2-8-6Z\" fill=\"#dcfce7\"/>\n    <circle cx=\"30\" cy=\"30\" r=\"3\" fill=\"#86efac\"/>\n    <circle cx=\"36\" cy=\"36\" r=\"3\" fill=\"#86efac\"/>\n    <circle cx=\"40\" cy=\"28\" r=\"2.5\" fill=\"#4ade80\"/>",
                ),
                "sort_order": 6,
            },
            {
                "code": "milk",
                "name": "Milk",
                "category": "allergen",
                "keywords": ["milk", "dairy", "lactose", "cheese", "butter", "cream"],
                "icon_svg": _hex_icon(
                    "#bfdbfe",
                    "#1d4ed8",
                    "    <path d=\"M26 18h12l2 6v24c0 2.2-1.8 4-4 4h-8c-2.2 0-4-1.8-4-4V24l2-6Z\" fill=\"#ffffff\" opacity=\"0.92\"/>\n    <path d=\"M26 24h16\" stroke=\"#93c5fd\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <rect x=\"28\" y=\"32\" width=\"8\" height=\"6\" rx=\"1\" fill=\"#bfdbfe\"/>",
                ),
                "sort_order": 7,
            },
            {
                "code": "tree_nuts",
                "name": "Tree nuts",
                "category": "allergen",
                "keywords": [
                    "almond",
                    "hazelnut",
                    "walnut",
                    "cashew",
                    "pecan",
                    "brazil nut",
                    "pistachio",
                    "macadamia",
                    "nut",
                ],
                "icon_svg": _hex_icon(
                    "#f59e0b",
                    "#92400e",
                    "    <path d=\"M32 18c8 0 14 6 14 14 0 10-10 16-14 18-4-2-14-8-14-18 0-8 6-14 14-14Z\" fill=\"#fef3c7\"/>\n    <path d=\"M32 20c4 4 6 8 6 12s-2 8-6 12c-4-4-6-8-6-12s2-8 6-12Z\" fill=\"#fde68a\"/>\n    <path d=\"M32 20v24\" stroke=\"#d97706\" stroke-width=\"3\" stroke-linecap=\"round\"/>",
                ),
                "sort_order": 8,
            },
            {
                "code": "celery",
                "name": "Celery",
                "category": "allergen",
                "keywords": ["celery", "celeriac", "apium"],
                "icon_svg": _hex_icon(
                    "#34d399",
                    "#047857",
                    "    <path d=\"M30 16c-4 4-4 10-2 14-2 6-2 12 0 18h8c2-6 2-12 0-18 2-4 2-10-2-14\" fill=\"#bbf7d0\"/>\n    <path d=\"M28 20h8\" stroke=\"#34d399\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <path d=\"M28 26h8\" stroke=\"#34d399\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <path d=\"M30 32h4\" stroke=\"#34d399\" stroke-width=\"3\" stroke-linecap=\"round\"/>",
                ),
                "sort_order": 9,
            },
            {
                "code": "mustard",
                "name": "Mustard",
                "category": "allergen",
                "keywords": ["mustard", "dijon", "wholegrain", "yellow mustard", "brown mustard"],
                "icon_svg": _hex_icon(
                    "#fbbf24",
                    "#92400e",
                    "    <path d=\"M28 18h8l4 6v22c0 2.2-1.8 4-4 4h-8c-2.2 0-4-1.8-4-4V24l4-6Z\" fill=\"#fef3c7\"/>\n    <rect x=\"28\" y=\"26\" width=\"8\" height=\"10\" rx=\"2\" fill=\"#f59e0b\"/>\n    <path d=\"M30 20h4\" stroke=\"#f59e0b\" stroke-width=\"3\" stroke-linecap=\"round\"/>",
                ),
                "sort_order": 10,
            },
            {
                "code": "sesame",
                "name": "Sesame seeds",
                "category": "allergen",
                "keywords": ["sesame", "tahini", "sesame seed", "gomasio"],
                "icon_svg": _hex_icon(
                    "#fcd34d",
                    "#b45309",
                    "    <ellipse cx=\"26\" cy=\"24\" rx=\"3\" ry=\"4\" fill=\"#ffffff\" opacity=\"0.95\"/>\n    <ellipse cx=\"38\" cy=\"22\" rx=\"3\" ry=\"4\" fill=\"#ffffff\" opacity=\"0.95\"/>\n    <ellipse cx=\"32\" cy=\"30\" rx=\"3\" ry=\"4\" fill=\"#ffffff\" opacity=\"0.95\"/>\n    <ellipse cx=\"26\" cy=\"36\" rx=\"3\" ry=\"4\" fill=\"#ffffff\" opacity=\"0.95\"/>\n    <ellipse cx=\"38\" cy=\"38\" rx=\"3\" ry=\"4\" fill=\"#ffffff\" opacity=\"0.95\"/>\n    <ellipse cx=\"32\" cy=\"44\" rx=\"3\" ry=\"4\" fill=\"#ffffff\" opacity=\"0.95\"/>",
                ),
                "sort_order": 11,
            },
            {
                "code": "sulphites",
                "name": "Sulphur dioxide & sulphites",
                "category": "allergen",
                "keywords": [
                    "sulphite",
                    "sulfite",
                    "so2",
                    "preservative",
                    "e220",
                    "e221",
                    "e222",
                    "e223",
                    "e224",
                    "e226",
                    "e227",
                    "e228",
                ],
                "icon_svg": _hex_icon(
                    "#a855f7",
                    "#6b21a8",
                    "    <text x=\"32\" y=\"36\" text-anchor=\"middle\" font-size=\"18\" fill=\"#ffffff\" font-weight=\"bold\">SO<tspan baseline-shift=\"sub\" font-size=\"10\">2</tspan></text>",
                ),
                "sort_order": 12,
            },
            {
                "code": "lupin",
                "name": "Lupin",
                "category": "allergen",
                "keywords": ["lupin", "lupine", "lupini", "lupin flour"],
                "icon_svg": _hex_icon(
                    "#c084fc",
                    "#6d28d9",
                    "    <path d=\"M32 18c-4 8-6 14-6 18 0 6 2 10 6 14 4-4 6-8 6-14 0-4-2-10-6-18Z\" fill=\"#ede9fe\"/>\n    <path d=\"M32 18c-2 6-4 10-4 14 0 4 2 8 4 10 2-2 4-6 4-10 0-4-2-8-4-14Z\" fill=\"#ddd6fe\"/>\n    <circle cx=\"32\" cy=\"32\" r=\"3\" fill=\"#c4b5fd\"/>",
                ),
                "sort_order": 13,
            },
            {
                "code": "molluscs",
                "name": "Molluscs",
                "category": "allergen",
                "keywords": ["mollusc", "mussel", "oyster", "clam", "octopus", "squid", "scallop", "snail"],
                "icon_svg": _hex_icon(
                    "#60a5fa",
                    "#1e3a8a",
                    "    <path d=\"M20 36c0-8 10-18 20-18 4 0 8 4 8 10s-4 12-10 16-10 4-14 0c-2-2-4-4-4-8Z\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n    <path d=\"M28 34c2 2 6 2 8 0\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <path d=\"M26 40c4 2 8 2 12 0\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\"/>",
                ),
                "sort_order": 14,
            },
            {
                "code": "vegan",
                "name": "Vegan",
                "category": "diet",
                "keywords": ["vegan", "plant-based", "plant based", "no animal"],
                "icon_svg": _hex_icon(
                    "#22c55e",
                    "#166534",
                    "    <path d=\"M20 36c6-14 14-20 24-22-2 12-8 22-14 28-4-4-6-2-10-6Z\" fill=\"#dcfce7\"/>\n    <path d=\"M24 38c4 4 8 8 12 10\" stroke=\"#16a34a\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <path d=\"M26 26c4 0 8 2 10 4\" stroke=\"#16a34a\" stroke-width=\"3\" stroke-linecap=\"round\"/>",
                ),
                "sort_order": 15,
            },
            {
                "code": "vegetarian",
                "name": "Vegetarian",
                "category": "diet",
                "keywords": ["vegetarian", "ovo-lacto", "ovo lacto", "meat-free"],
                "icon_svg": _hex_icon(
                    "#4ade80",
                    "#15803d",
                    "    <path d=\"M22 40c2-10 8-18 18-24 0 10-2 18-8 26-2 2-6 4-10-2Z\" fill=\"#bbf7d0\"/>\n    <path d=\"M24 42c6 4 12 4 16 0\" stroke=\"#15803d\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <circle cx=\"30\" cy=\"28\" r=\"3\" fill=\"#4ade80\"/>",
                ),
                "sort_order": 16,
            },
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_allergen_badge_code", table_name="allergen_badge")
    op.drop_table("allergen_badge")

