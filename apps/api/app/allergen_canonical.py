"""Canonical allergen definitions shared across services."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, Mapping, Optional


@dataclass(frozen=True)
class CanonicalAllergen:
    """Normalized allergen entry used for LLM predictions and API responses."""

    slug: str
    label: str
    legacy_codes: tuple[str, ...]
    aliases: tuple[str, ...]


_CANONICAL_DATA: tuple[CanonicalAllergen, ...] = (
    CanonicalAllergen(
        slug="wheat",
        label="Wheat",
        legacy_codes=(),
        aliases=(
            "wheat",
            "gluten",
            "durum wheat",
            "semolina",
            "farina",
            "flour",
            "bread",
            "cereal",
            "cereals",
        ),
    ),
    CanonicalAllergen(
        slug="barley",
        label="Barley",
        legacy_codes=(),
        aliases=("barley", "malt", "hordeum"),
    ),
    CanonicalAllergen(
        slug="rye",
        label="Rye",
        legacy_codes=(),
        aliases=("rye", "pumpernickel", "secale"),
    ),
    CanonicalAllergen(
        slug="oats",
        label="Oats",
        legacy_codes=(),
        aliases=("oats", "oatmeal", "rolled oats"),
    ),
    CanonicalAllergen(
        slug="spelt",
        label="Spelt",
        legacy_codes=(),
        aliases=("spelt", "dinkel", "spelt flour"),
    ),
    CanonicalAllergen(
        slug="triticale",
        label="Triticale",
        legacy_codes=(),
        aliases=("triticale", "triticale flour"),
    ),
    CanonicalAllergen(
        slug="crustaceans",
        label="Crustaceans",
        legacy_codes=(),
        aliases=("crustacean", "shrimp", "prawn", "crab", "lobster", "crayfish", "shellfish"),
    ),
    CanonicalAllergen(
        slug="eggs",
        label="Eggs",
        legacy_codes=(),
        aliases=("egg", "eggs", "albumen", "meringue"),
    ),
    CanonicalAllergen(
        slug="fish",
        label="Fish",
        legacy_codes=(),
        aliases=("fish", "salmon", "cod", "trout", "haddock", "tuna", "bass"),
    ),
    CanonicalAllergen(
        slug="peanuts",
        label="Peanuts",
        legacy_codes=(),
        aliases=("peanut", "peanuts", "groundnut", "groundnuts", "satay", "arachis"),
    ),
    CanonicalAllergen(
        slug="soybeans",
        label="Soybeans",
        legacy_codes=(),
        aliases=("soy", "soya", "soybean", "soybeans", "edamame", "tofu", "tempeh", "lecithin"),
    ),
    CanonicalAllergen(
        slug="milk",
        label="Milk",
        legacy_codes=(),
        aliases=("milk", "dairy", "lactose", "cheese", "butter", "cream", "yogurt"),
    ),
    CanonicalAllergen(
        slug="tree_nuts",
        label="Tree nuts",
        legacy_codes=(),
        aliases=(
            "nut",
            "nuts",
            "almond",
            "almonds",
            "hazelnut",
            "hazelnuts",
            "walnut",
            "walnuts",
            "cashew",
            "cashews",
            "pecan",
            "pecans",
            "brazil nut",
            "brazil nuts",
            "pistachio",
            "pistachios",
            "macadamia",
            "macadamia nut",
        ),
    ),
    CanonicalAllergen(
        slug="celery",
        label="Celery",
        legacy_codes=(),
        aliases=("celery", "celeriac", "apium"),
    ),
    CanonicalAllergen(
        slug="mustard",
        label="Mustard",
        legacy_codes=(),
        aliases=("mustard", "dijon", "wholegrain", "yellow mustard", "brown mustard"),
    ),
    CanonicalAllergen(
        slug="sesame",
        label="Sesame seeds",
        legacy_codes=(),
        aliases=("sesame", "sesame seed", "sesame seeds", "tahini", "gomasio"),
    ),
    CanonicalAllergen(
        slug="sulphites",
        label="Sulphur dioxide & sulphites",
        legacy_codes=(),
        aliases=(
            "sulphite",
            "sulfite",
            "sulphites",
            "sulfites",
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
        ),
    ),
    CanonicalAllergen(
        slug="lupin",
        label="Lupin",
        legacy_codes=(),
        aliases=("lupin", "lupine", "lupini", "lupin flour"),
    ),
    CanonicalAllergen(
        slug="molluscs",
        label="Molluscs",
        legacy_codes=(),
        aliases=("mollusc", "molluscs", "mussel", "mussels", "oyster", "oysters", "clam", "octopus", "squid", "scallop", "snail"),
    ),
    CanonicalAllergen(
        slug="meat",
        label="Meat or animal derivative",
        legacy_codes=(),
        aliases=("meat", "beef", "pork", "chicken", "lamb", "steak", "bacon", "ham", "sausage", "gelatin", "gelatine", "lard", "animal fat", "animal derivative"),
    ),
    CanonicalAllergen(
        slug="honey",
        label="Honey",
        legacy_codes=(),
        aliases=("honey", "bee honey", "raw honey"),
    ),
)


CANONICAL_ALLERGENS: Mapping[str, CanonicalAllergen] = {item.slug: item for item in _CANONICAL_DATA}
_CANONICAL_BY_LABEL: Mapping[str, CanonicalAllergen] = {
    item.label.lower(): item for item in _CANONICAL_DATA
}
_ALIAS_LOOKUP: Dict[str, CanonicalAllergen] = {}
for entry in _CANONICAL_DATA:
    _ALIAS_LOOKUP[entry.label.lower()] = entry
    for alias in entry.aliases:
        _ALIAS_LOOKUP[alias.lower()] = entry


_CERTAINTY_NORMALIZATION_RULES: Dict[str, str] = {
    "confirmed": "confirmed",
    "likely": "likely",
    "possible": "possible",
}



def canonicalize_allergen(value: object) -> Optional[CanonicalAllergen]:
    """Resolve a user/LLM supplied allergen into a canonical entry."""

    if value is None:
        return None
    if isinstance(value, CanonicalAllergen):
        return value
    text = str(value).strip().lower()
    if not text:
        return None
    return _ALIAS_LOOKUP.get(text)


def canonical_allergen_from_label(label: str) -> Optional[CanonicalAllergen]:
    """Look up a canonical allergen by its label."""

    if not label:
        return None
    return _CANONICAL_BY_LABEL.get(label.strip().lower())


def normalize_certainty(value: object) -> Optional[str]:
    """Normalize certainty text into a controlled vocabulary."""

    if value is None:
        return None
    text = str(value).strip().lower()
    if not text:
        return None
    return _CERTAINTY_NORMALIZATION_RULES.get(text)


def certainty_to_ui(value: Optional[str]) -> str:
    """Return certainty value directly (no translation needed)."""
    
    if not value:
        return "possible"  # Conservative default
    # Return as-is if valid, otherwise default to possible
    if value in ("confirmed", "likely", "possible"):
        return value
    return "possible"


def iter_all_aliases() -> Iterable[str]:
    """Return all known aliases for canonical allergens."""

    return _ALIAS_LOOKUP.keys()
