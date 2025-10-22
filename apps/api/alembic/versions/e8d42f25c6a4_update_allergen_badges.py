from alembic import op
import sqlalchemy as sa


revision = "e8d42f25c6a4"
down_revision = "d4f6f1f5e9ac"
branch_labels = None
depends_on = None


def _hex_icon(top_color: str, bottom_color: str, inner: str) -> str:
    return f"""<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\">\n  <defs>\n    <linearGradient id=\"grad\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\">\n      <stop offset=\"0%\" stop-color=\"{top_color}\"/>\n      <stop offset=\"100%\" stop-color=\"{bottom_color}\"/>\n    </linearGradient>\n    <clipPath id=\"clip\">\n      <polygon points=\"32 0 60 16 60 48 32 64 4 48 4 16\"/>\n    </clipPath>\n  </defs>\n  <polygon points=\"32 0 60 16 60 48 32 64 4 48 4 16\" fill=\"url(#grad)\"/>\n  <g clip-path=\"url(#clip)\">\n{inner}\n  </g>\n</svg>"""


def _grain_icon(label: str) -> str:
    return _hex_icon(
        "#f4b942",
        "#d97706",
        f"""    <path d=\"M32 14v36\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <path d=\"M26 20c4 4 4 12 0 16 4 4 4 12 0 16\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <path d=\"M38 20c-4 4-4 12 0 16-4 4-4 12 0 16\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <text x=\"32\" y=\"46\" text-anchor=\"middle\" font-size=\"14\" fill=\"#fde68a\" font-weight=\"700\" letter-spacing=\"0.5\" dominant-baseline=\"middle\">{label}</text>""",
    )


def _legacy_grain_icon() -> str:
    return _hex_icon(
        "#f4b942",
        "#d97706",
        "    <path d=\"M32 14v36\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <path d=\"M26 20c4 4 4 12 0 16 4 4 4 12 0 16\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <path d=\"M38 20c-4 4-4 12 0 16-4 4-4 12 0 16\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\"/>",
    )


def _nut_icon(label: str) -> str:
    return _hex_icon(
        "#f59e0b",
        "#92400e",
        f"""    <path d=\"M32 18c8 0 14 6 14 14 0 10-10 16-14 18-4-2-14-8-14-18 0-8 6-14 14-14Z\" fill=\"#fef3c7\"/>\n    <path d=\"M32 20c4 4 6 8 6 12s-2 8-6 12c-4-4-6-8-6-12s2-8 6-12Z\" fill=\"#fde68a\"/>\n    <path d=\"M32 20v24\" stroke=\"#d97706\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <text x=\"32\" y=\"46\" text-anchor=\"middle\" font-size=\"12\" fill=\"#78350f\" font-weight=\"700\" letter-spacing=\"0.5\" dominant-baseline=\"middle\">{label}</text>""",
    )


def _legacy_tree_nuts_icon() -> str:
    return _hex_icon(
        "#f59e0b",
        "#92400e",
        "    <path d=\"M32 18c8 0 14 6 14 14 0 10-10 16-14 18-4-2-14-8-14-18 0-8 6-14 14-14Z\" fill=\"#fef3c7\"/>\n    <path d=\"M32 20c4 4 6 8 6 12s-2 8-6 12c-4-4-6-8-6-12s2-8 6-12Z\" fill=\"#fde68a\"/>\n    <path d=\"M32 20v24\" stroke=\"#d97706\" stroke-width=\"3\" stroke-linecap=\"round\"/>",
    )


def _crustaceans_icon() -> str:
    return _hex_icon(
        "#fb7185",
        "#be123c",
        "    <path d=\"M21 28c0-6.5 5.5-12 12-12s12 5.5 12 12-5.5 12-12 12\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <path d=\"M23 36c3 3 7 5 10 5s7-2 10-5\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <path d=\"M21 28h6\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <path d=\"M37 28h6\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <circle cx=\"24\" cy=\"24\" r=\"2\" fill=\"#ffffff\"/>\n    <circle cx=\"40\" cy=\"24\" r=\"2\" fill=\"#ffffff\"/>",
    )


def _eggs_icon() -> str:
    return _hex_icon(
        "#f97316",
        "#c2410c",
        "    <path d=\"M32 16c-7 0-12 10-12 18s5 14 12 14 12-6 12-14-5-18-12-18Z\" fill=\"#ffffff\" opacity=\"0.85\"/>\n    <circle cx=\"32\" cy=\"34\" r=\"6\" fill=\"#facc15\"/>",
    )


def _fish_icon() -> str:
    return _hex_icon(
        "#38bdf8",
        "#0369a1",
        "    <path d=\"M20 32c4-6 9-10 12-10 8 0 16 6 16 10s-8 10-16 10c-3 0-8-4-12-10Z\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n    <path d=\"M20 32l-6-6v12l6-6Z\" fill=\"#ffffff\" opacity=\"0.9\"/>\n    <circle cx=\"34\" cy=\"30\" r=\"2\" fill=\"#ffffff\"/>",
    )


def _peanuts_icon() -> str:
    return _hex_icon(
        "#eab308",
        "#b45309",
        "    <path d=\"M26 22c-4 4-4 10 0 14s4 10 0 14c4 4 10 4 14 0 4-4 4-10 0-14s-4-10 0-14c-4-4-10-4-14 0Z\" fill=\"#fef3c7\"/>\n    <path d=\"M32 22c-2 4-2 8 0 12s2 8 0 12\" fill=\"none\" stroke=\"#f59e0b\" stroke-width=\"3\" stroke-linecap=\"round\"/>",
    )


def _soybeans_icon() -> str:
    return _hex_icon(
        "#84cc16",
        "#4d7c0f",
        "    <path d=\"M20 36c4-8 12-14 24-16-2 10-8 18-16 22-4 2-6 2-8-6Z\" fill=\"#dcfce7\"/>\n    <circle cx=\"30\" cy=\"30\" r=\"3\" fill=\"#86efac\"/>\n    <circle cx=\"36\" cy=\"36\" r=\"3\" fill=\"#86efac\"/>\n    <circle cx=\"40\" cy=\"28\" r=\"2.5\" fill=\"#4ade80\"/>",
    )


def _milk_icon() -> str:
    return _hex_icon(
        "#bfdbfe",
        "#1d4ed8",
        "    <path d=\"M26 18h12l2 6v24c0 2.2-1.8 4-4 4h-8c-2.2 0-4-1.8-4-4V24l2-6Z\" fill=\"#ffffff\" opacity=\"0.92\"/>\n    <path d=\"M26 24h16\" stroke=\"#93c5fd\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <rect x=\"28\" y=\"32\" width=\"8\" height=\"6\" rx=\"1\" fill=\"#bfdbfe\"/>",
    )


def _celery_icon() -> str:
    return _hex_icon(
        "#34d399",
        "#047857",
        "    <path d=\"M30 16c-4 4-4 10-2 14-2 6-2 12 0 18h8c2-6 2-12 0-18 2-4 2-10-2-14\" fill=\"#bbf7d0\"/>\n    <path d=\"M28 20h8\" stroke=\"#34d399\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <path d=\"M28 26h8\" stroke=\"#34d399\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <path d=\"M30 32h4\" stroke=\"#34d399\" stroke-width=\"3\" stroke-linecap=\"round\"/>",
    )


def _mustard_icon() -> str:
    return _hex_icon(
        "#fbbf24",
        "#92400e",
        "    <path d=\"M28 18h8l4 6v22c0 2.2-1.8 4-4 4h-8c-2.2 0-4-1.8-4-4V24l4-6Z\" fill=\"#fef3c7\"/>\n    <rect x=\"28\" y=\"26\" width=\"8\" height=\"10\" rx=\"2\" fill=\"#f59e0b\"/>\n    <path d=\"M30 20h4\" stroke=\"#f59e0b\" stroke-width=\"3\" stroke-linecap=\"round\"/>",
    )


def _sesame_icon() -> str:
    return _hex_icon(
        "#fcd34d",
        "#b45309",
        "    <g fill=\"#ffffff\" opacity=\"0.95\">\n      <ellipse cx=\"26\" cy=\"24\" rx=\"3\" ry=\"4\"/>\n      <ellipse cx=\"38\" cy=\"22\" rx=\"3\" ry=\"4\"/>\n      <ellipse cx=\"32\" cy=\"30\" rx=\"3\" ry=\"4\"/>\n      <ellipse cx=\"26\" cy=\"36\" rx=\"3\" ry=\"4\"/>\n      <ellipse cx=\"38\" cy=\"38\" rx=\"3\" ry=\"4\"/>\n      <ellipse cx=\"32\" cy=\"44\" rx=\"3\" ry=\"4\"/>\n    </g>",
    )


def _sulphites_icon() -> str:
    return _hex_icon(
        "#a855f7",
        "#6b21a8",
        "    <text x=\"32\" y=\"36\" text-anchor=\"middle\" font-size=\"18\" fill=\"#ffffff\" font-weight=\"700\">SO<tspan baseline-shift=\"sub\" font-size=\"10\">2</tspan></text>",
    )


def _lupin_icon() -> str:
    return _hex_icon(
        "#c084fc",
        "#6d28d9",
        "    <path d=\"M32 18c-4 8-6 14-6 18 0 6 2 10 6 14 4-4 6-8 6-14 0-4-2-10-6-18Z\" fill=\"#ede9fe\"/>\n    <path d=\"M32 18c-2 6-4 10-4 14 0 4 2 8 4 10 2-2 4-6 4-10 0-4-2-8-4-14Z\" fill=\"#ddd6fe\"/>\n    <circle cx=\"32\" cy=\"32\" r=\"3\" fill=\"#c4b5fd\"/>",
    )


def _molluscs_icon() -> str:
    return _hex_icon(
        "#60a5fa",
        "#1e3a8a",
        "    <path d=\"M20 36c0-8 10-18 20-18 4 0 8 4 8 10s-4 12-10 16-10 4-14 0c-2-2-4-4-4-8Z\" fill=\"none\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n    <path d=\"M28 34c2 2 6 2 8 0\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <path d=\"M26 40c4 2 8 2 12 0\" stroke=\"#ffffff\" stroke-width=\"3\" stroke-linecap=\"round\"/>",
    )


def _meat_icon() -> str:
    return _hex_icon(
        "#f87171",
        "#b91c1c",
        "    <path d=\"M24 26c-4 4-4 10 0 14s10 4 14 0 4-10 0-14-10-4-14 0Z\" fill=\"#fecdd3\"/>\n    <path d=\"M38 32c4-2 6 2 6 4 2 0 4 2 4 4s-2 4-4 4-4-2-4-4c-2 2-6 2-8 0\" fill=\"none\" stroke=\"#fee2e2\" stroke-width=\"3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n    <circle cx=\"42\" cy=\"38\" r=\"2.5\" fill=\"#fee2e2\"/>\n    <circle cx=\"46\" cy=\"42\" r=\"2\" fill=\"#ffffff\" opacity=\"0.85\"/>",
    )


def _animal_product_icon() -> str:
    return _hex_icon(
        "#facc15",
        "#b45309",
        "    <path d=\"M32 18c-6 6-10 12-10 18 0 6 4 12 10 12s10-6 10-12c0-6-4-12-10-18Z\" fill=\"#fef3c7\"/>\n    <path d=\"M28 32c2 2 6 2 8 0\" stroke=\"#fbbf24\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <path d=\"M30 38c2 2 4 2 6 0\" stroke=\"#f59e0b\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <circle cx=\"32\" cy=\"28\" r=\"4\" fill=\"#fcd34d\"/>\n    <circle cx=\"32\" cy=\"44\" r=\"3\" fill=\"#fde68a\"/>",
    )


def _vegan_icon() -> str:
    return _hex_icon(
        "#22c55e",
        "#166534",
        "    <path d=\"M20 36c6-14 14-20 24-22-2 12-8 22-14 28-4-4-6-2-10-6Z\" fill=\"#dcfce7\"/>\n    <path d=\"M24 38c4 4 8 8 12 10\" stroke=\"#16a34a\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <path d=\"M26 26c4 0 8 2 10 4\" stroke=\"#16a34a\" stroke-width=\"3\" stroke-linecap=\"round\"/>",
    )


def _vegetarian_icon() -> str:
    return _hex_icon(
        "#4ade80",
        "#15803d",
        "    <path d=\"M22 40c2-10 8-18 18-24 0 10-2 18-8 26-2 2-6 4-10-2Z\" fill=\"#bbf7d0\"/>\n    <path d=\"M24 42c6 4 12 4 16 0\" stroke=\"#15803d\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <circle cx=\"30\" cy=\"28\" r=\"3\" fill=\"#4ade80\"/>",
    )


def upgrade() -> None:
    badges_table = sa.table(
        "allergen_badge",
        sa.column("code", sa.String(length=100)),
        sa.column("name", sa.String(length=255)),
        sa.column("category", sa.String(length=50)),
        sa.column("keywords", sa.JSON()),
        sa.column("icon_svg", sa.Text()),
        sa.column("sort_order", sa.Integer()),
    )

    op.execute("DELETE FROM allergen_badge")

    op.bulk_insert(
        badges_table,
        [
            {
                "code": "gluten_wheat",
                "name": "Gluten (wheat)",
                "category": "allergen",
                "keywords": ["gluten", "wheat", "bread", "flour"],
                "icon_svg": _grain_icon("W"),
                "sort_order": 1,
            },
            {
                "code": "gluten_barley",
                "name": "Gluten (barley)",
                "category": "allergen",
                "keywords": ["gluten", "barley", "malt", "beer"],
                "icon_svg": _grain_icon("B"),
                "sort_order": 2,
            },
            {
                "code": "gluten_rye",
                "name": "Gluten (rye)",
                "category": "allergen",
                "keywords": ["gluten", "rye", "pumpernickel"],
                "icon_svg": _grain_icon("R"),
                "sort_order": 3,
            },
            {
                "code": "gluten_oats",
                "name": "Gluten (oats)",
                "category": "allergen",
                "keywords": ["gluten", "oats", "oatmeal"],
                "icon_svg": _grain_icon("O"),
                "sort_order": 4,
            },
            {
                "code": "gluten_spelt",
                "name": "Gluten (spelt)",
                "category": "allergen",
                "keywords": ["gluten", "spelt", "dinkel"],
                "icon_svg": _grain_icon("S"),
                "sort_order": 5,
            },
            {
                "code": "gluten_triticale",
                "name": "Gluten (triticale)",
                "category": "allergen",
                "keywords": ["gluten", "triticale"],
                "icon_svg": _grain_icon("T"),
                "sort_order": 6,
            },
            {
                "code": "crustaceans",
                "name": "Crustaceans",
                "category": "allergen",
                "keywords": ["crustacean", "shrimp", "prawn", "crab", "lobster", "crayfish"],
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
                "keywords": ["fish", "salmon", "cod", "trout", "haddock"],
                "icon_svg": _fish_icon(),
                "sort_order": 9,
            },
            {
                "code": "peanuts",
                "name": "Peanuts",
                "category": "allergen",
                "keywords": ["peanut", "groundnut", "satay", "arachis"],
                "icon_svg": _peanuts_icon(),
                "sort_order": 10,
            },
            {
                "code": "soybeans",
                "name": "Soybeans",
                "category": "allergen",
                "keywords": ["soy", "soya", "soybean", "edamame", "tofu", "tempeh", "lecithin"],
                "icon_svg": _soybeans_icon(),
                "sort_order": 11,
            },
            {
                "code": "milk",
                "name": "Milk",
                "category": "allergen",
                "keywords": ["milk", "dairy", "lactose", "cheese", "butter", "cream"],
                "icon_svg": _milk_icon(),
                "sort_order": 12,
            },
            {
                "code": "nuts_almond",
                "name": "Nuts (almond)",
                "category": "allergen",
                "keywords": ["almond", "marzipan", "nuts"],
                "icon_svg": _nut_icon("AL"),
                "sort_order": 13,
            },
            {
                "code": "nuts_hazelnut",
                "name": "Nuts (hazelnut)",
                "category": "allergen",
                "keywords": ["hazelnut", "filbert", "gianduja"],
                "icon_svg": _nut_icon("HZ"),
                "sort_order": 14,
            },
            {
                "code": "nuts_walnut",
                "name": "Nuts (walnut)",
                "category": "allergen",
                "keywords": ["walnut", "nuts"],
                "icon_svg": _nut_icon("WA"),
                "sort_order": 15,
            },
            {
                "code": "nuts_cashew",
                "name": "Nuts (cashew)",
                "category": "allergen",
                "keywords": ["cashew", "nuts", "kaju"],
                "icon_svg": _nut_icon("CA"),
                "sort_order": 16,
            },
            {
                "code": "nuts_pecan",
                "name": "Nuts (pecan)",
                "category": "allergen",
                "keywords": ["pecan", "praline", "nuts"],
                "icon_svg": _nut_icon("PE"),
                "sort_order": 17,
            },
            {
                "code": "nuts_brazil_nut",
                "name": "Nuts (brazil nut)",
                "category": "allergen",
                "keywords": ["brazil nut", "paranut", "nuts"],
                "icon_svg": _nut_icon("BR"),
                "sort_order": 18,
            },
            {
                "code": "nuts_pistachio",
                "name": "Nuts (pistachio)",
                "category": "allergen",
                "keywords": ["pistachio", "baklava", "nuts"],
                "icon_svg": _nut_icon("PI"),
                "sort_order": 19,
            },
            {
                "code": "nuts_macadamia",
                "name": "Nuts (macadamia)",
                "category": "allergen",
                "keywords": ["macadamia", "nuts"],
                "icon_svg": _nut_icon("MA"),
                "sort_order": 20,
            },
            {
                "code": "celery",
                "name": "Celery",
                "category": "allergen",
                "keywords": ["celery", "celeriac", "apium"],
                "icon_svg": _celery_icon(),
                "sort_order": 21,
            },
            {
                "code": "mustard",
                "name": "Mustard",
                "category": "allergen",
                "keywords": ["mustard", "dijon", "wholegrain", "yellow mustard", "brown mustard"],
                "icon_svg": _mustard_icon(),
                "sort_order": 22,
            },
            {
                "code": "sesame",
                "name": "Sesame seeds",
                "category": "allergen",
                "keywords": ["sesame", "tahini", "sesame seed", "gomasio"],
                "icon_svg": _sesame_icon(),
                "sort_order": 23,
            },
            {
                "code": "sulphites",
                "name": "Sulphur dioxide & sulphites",
                "category": "allergen",
                "keywords": ["sulphite", "sulfite", "so2", "preservative", "e220", "e221", "e222", "e223", "e224", "e226", "e227", "e228"],
                "icon_svg": _sulphites_icon(),
                "sort_order": 24,
            },
            {
                "code": "lupin",
                "name": "Lupin",
                "category": "allergen",
                "keywords": ["lupin", "lupine", "lupini", "lupin flour"],
                "icon_svg": _lupin_icon(),
                "sort_order": 25,
            },
            {
                "code": "molluscs",
                "name": "Molluscs",
                "category": "allergen",
                "keywords": ["mollusc", "mussel", "oyster", "clam", "octopus", "squid", "scallop", "snail"],
                "icon_svg": _molluscs_icon(),
                "sort_order": 26,
            },
            {
                "code": "meat",
                "name": "Meat",
                "category": "diet",
                "keywords": ["meat", "beef", "pork", "lamb", "chicken", "steak"],
                "icon_svg": _meat_icon(),
                "sort_order": 27,
            },
            {
                "code": "animal_product",
                "name": "Animal product (honey, fat, gelatin)",
                "category": "diet",
                "keywords": ["animal product", "honey", "gelatin", "lard", "animal fat"],
                "icon_svg": _animal_product_icon(),
                "sort_order": 28,
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


def downgrade() -> None:
    badges_table = sa.table(
        "allergen_badge",
        sa.column("code", sa.String(length=100)),
        sa.column("name", sa.String(length=255)),
        sa.column("category", sa.String(length=50)),
        sa.column("keywords", sa.JSON()),
        sa.column("icon_svg", sa.Text()),
        sa.column("sort_order", sa.Integer()),
    )

    op.execute("DELETE FROM allergen_badge")

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
                "icon_svg": _legacy_grain_icon(),
                "sort_order": 1,
            },
            {
                "code": "crustaceans",
                "name": "Crustaceans",
                "category": "allergen",
                "keywords": ["crustacean", "shrimp", "prawn", "crab", "lobster", "crayfish"],
                "icon_svg": _crustaceans_icon(),
                "sort_order": 2,
            },
            {
                "code": "eggs",
                "name": "Eggs",
                "category": "allergen",
                "keywords": ["egg", "eggs", "albumen", "meringue"],
                "icon_svg": _eggs_icon(),
                "sort_order": 3,
            },
            {
                "code": "fish",
                "name": "Fish",
                "category": "allergen",
                "keywords": ["fish", "salmon", "cod", "trout", "haddock"],
                "icon_svg": _fish_icon(),
                "sort_order": 4,
            },
            {
                "code": "peanuts",
                "name": "Peanuts",
                "category": "allergen",
                "keywords": ["peanut", "groundnut", "satay", "arachis"],
                "icon_svg": _peanuts_icon(),
                "sort_order": 5,
            },
            {
                "code": "soybeans",
                "name": "Soybeans",
                "category": "allergen",
                "keywords": ["soy", "soya", "soybean", "edamame", "tofu", "tempeh", "lecithin"],
                "icon_svg": _soybeans_icon(),
                "sort_order": 6,
            },
            {
                "code": "milk",
                "name": "Milk",
                "category": "allergen",
                "keywords": ["milk", "dairy", "lactose", "cheese", "butter", "cream"],
                "icon_svg": _milk_icon(),
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
                "icon_svg": _legacy_tree_nuts_icon(),
                "sort_order": 8,
            },
            {
                "code": "celery",
                "name": "Celery",
                "category": "allergen",
                "keywords": ["celery", "celeriac", "apium"],
                "icon_svg": _celery_icon(),
                "sort_order": 9,
            },
            {
                "code": "mustard",
                "name": "Mustard",
                "category": "allergen",
                "keywords": ["mustard", "dijon", "wholegrain", "yellow mustard", "brown mustard"],
                "icon_svg": _mustard_icon(),
                "sort_order": 10,
            },
            {
                "code": "sesame",
                "name": "Sesame seeds",
                "category": "allergen",
                "keywords": ["sesame", "tahini", "sesame seed", "gomasio"],
                "icon_svg": _sesame_icon(),
                "sort_order": 11,
            },
            {
                "code": "sulphites",
                "name": "Sulphur dioxide & sulphites",
                "category": "allergen",
                "keywords": ["sulphite", "sulfite", "so2", "preservative", "e220", "e221", "e222", "e223", "e224", "e226", "e227", "e228"],
                "icon_svg": _sulphites_icon(),
                "sort_order": 12,
            },
            {
                "code": "lupin",
                "name": "Lupin",
                "category": "allergen",
                "keywords": ["lupin", "lupine", "lupini", "lupin flour"],
                "icon_svg": _lupin_icon(),
                "sort_order": 13,
            },
            {
                "code": "molluscs",
                "name": "Molluscs",
                "category": "allergen",
                "keywords": ["mollusc", "mussel", "oyster", "clam", "octopus", "squid", "scallop", "snail"],
                "icon_svg": _molluscs_icon(),
                "sort_order": 14,
            },
            {
                "code": "vegan",
                "name": "Vegan",
                "category": "diet",
                "keywords": ["vegan", "plant-based", "plant based", "no animal"],
                "icon_svg": _vegan_icon(),
                "sort_order": 15,
            },
            {
                "code": "vegetarian",
                "name": "Vegetarian",
                "category": "diet",
                "keywords": ["vegetarian", "ovo", "lacto", "contains meat"],
                "icon_svg": _vegetarian_icon(),
                "sort_order": 16,
            },
        ],
    )
