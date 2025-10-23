"""Canonical allergen definitions shared across services."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, Mapping, Optional
import re


@dataclass(frozen=True)
class CanonicalAllergen:
    """Normalized allergen entry used for LLM predictions and API responses."""

    slug: str
    label: str
    legacy_codes: tuple[str, ...]
    aliases: tuple[str, ...]


_CANONICAL_DATA: tuple[CanonicalAllergen, ...] = (
    CanonicalAllergen(
        slug="cereals_gluten",
        label="Cereals containing gluten",
        legacy_codes=("en:gluten", "en:wheat", "en:barley", "en:rye", "en:oats", "en:spelt", "en:triticale"),
        aliases=(
            "gluten",
            "wheat",
            "rye",
            "barley",
            "oats",
            "spelt",
            "triticale",
            "cereal",
            "cereals",
            "cereals containing gluten",
        ),
    ),
    CanonicalAllergen(
        slug="crustaceans",
        label="Crustaceans",
        legacy_codes=("en:crustaceans", "en:shrimps", "en:crab", "en:lobster"),
        aliases=("crustacean", "shrimp", "prawn", "crab", "lobster", "crayfish", "shellfish"),
    ),
    CanonicalAllergen(
        slug="eggs",
        label="Eggs",
        legacy_codes=("en:eggs", "en:egg", "en:albumen"),
        aliases=("egg", "eggs", "albumen", "meringue"),
    ),
    CanonicalAllergen(
        slug="fish",
        label="Fish",
        legacy_codes=("en:fish", "en:salmon", "en:cod"),
        aliases=("fish", "salmon", "cod", "trout", "haddock"),
    ),
    CanonicalAllergen(
        slug="peanuts",
        label="Peanuts",
        legacy_codes=("en:peanuts", "en:groundnuts", "en:arachis"),
        aliases=("peanut", "peanuts", "groundnut", "groundnuts", "satay", "arachis"),
    ),
    CanonicalAllergen(
        slug="soybeans",
        label="Soybeans",
        legacy_codes=("en:soybeans", "en:soya", "en:soy"),
        aliases=("soy", "soya", "soybean", "soybeans", "edamame", "tofu", "tempeh", "lecithin"),
    ),
    CanonicalAllergen(
        slug="milk",
        label="Milk",
        legacy_codes=("en:milk", "en:lactose", "en:dairy"),
        aliases=("milk", "dairy", "lactose", "cheese", "butter", "cream"),
    ),
    CanonicalAllergen(
        slug="tree_nuts",
        label="Tree nuts",
        legacy_codes=(
            "en:nuts",
            "en:almonds",
            "en:hazelnuts",
            "en:walnuts",
            "en:cashews",
            "en:pecans",
            "en:brazil-nuts",
            "en:pistachio",
            "en:macadamia-nut",
        ),
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
        legacy_codes=("en:celery", "en:celeriac"),
        aliases=("celery", "celeriac", "apium"),
    ),
    CanonicalAllergen(
        slug="mustard",
        label="Mustard",
        legacy_codes=("en:mustard", "en:mustard-seeds"),
        aliases=("mustard", "dijon", "wholegrain", "yellow mustard", "brown mustard"),
    ),
    CanonicalAllergen(
        slug="sesame",
        label="Sesame seeds",
        legacy_codes=("en:sesame", "en:sesame-seeds", "en:tahini"),
        aliases=("sesame", "sesame seed", "sesame seeds", "tahini", "gomasio"),
    ),
    CanonicalAllergen(
        slug="sulphites",
        label="Sulphur dioxide & sulphites",
        legacy_codes=("en:sulphur-dioxide-and-sulphites", "en:sulphur-dioxide", "en:sulfites"),
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
        legacy_codes=("en:lupin", "en:lupine"),
        aliases=("lupin", "lupine", "lupini", "lupin flour"),
    ),
    CanonicalAllergen(
        slug="molluscs",
        label="Molluscs",
        legacy_codes=("en:molluscs", "en:mussels", "en:oysters", "en:squid", "en:octopus"),
        aliases=("mollusc", "molluscs", "mussel", "mussels", "oyster", "oysters", "clam", "octopus", "squid", "scallop", "snail"),
    ),
    CanonicalAllergen(
        slug="vegan",
        label="Not plant-based (vegan)",
        legacy_codes=(),
        aliases=("vegan", "not vegan", "non-vegan", "animal product", "animal-derived"),
    ),
    CanonicalAllergen(
        slug="vegetarian",
        label="Not plant-based (vegetarian)",
        legacy_codes=(),
        aliases=("vegetarian", "not vegetarian", "non-vegetarian", "meat", "seafood product"),
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
    for code in entry.legacy_codes:
        _ALIAS_LOOKUP[code.lower()] = entry


_CERTAINTY_NORMALIZATION_RULES: Dict[str, str] = {
    "direct": "direct",
    "confirmed": "direct",
    "certain": "direct",
    "definite": "direct",
    "explicit": "direct",
    "sure": "direct",
    "inferred": "inferred",
    "suggested": "inferred",
    "estimated": "inferred",
    "assumed": "inferred",
    "high": "high",
    "very high": "high",
    "high confidence": "high",
    "likely": "likely",
    "most likely": "likely",
    "probable": "likely",
    "strong": "likely",
    "medium": "medium",
    "moderate": "medium",
    "medium confidence": "medium",
    "possible": "possible",
    "potential": "possible",
    "maybe": "possible",
    "uncertain": "possible",
    "low": "low",
    "low confidence": "low",
    "speculative": "low",
    "unknown": "unknown",
    "n/a": "unknown",
    "na": "unknown",
    "unspecified": "unknown",
    "predicted": "possible",
}

_UI_CERTAINTY_MAP: Dict[str, str] = {
    "direct": "confirmed",
    "high": "likely",
    "likely": "likely",
    "probable": "likely",
    "inferred": "likely",
    "medium": "likely",
    "possible": "possible",
    "low": "possible",
    "unknown": "possible",
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
    """Normalize free-form certainty text into a controlled vocabulary."""

    if value is None:
        return None
    text = str(value).strip().lower()
    if not text:
        return None
    text = re.sub(r"\s+", " ", text)
    normalized = _CERTAINTY_NORMALIZATION_RULES.get(text)
    if normalized:
        return normalized
    # Try to match prefixes like "very high" -> "high"
    for key, target in _CERTAINTY_NORMALIZATION_RULES.items():
        if text.startswith(key):
            return target
    return None


def certainty_to_ui(value: Optional[str]) -> str:
    """Translate a normalized certainty value into UI vocabulary."""

    if not value:
        return "predicted"
    mapped = _UI_CERTAINTY_MAP.get(value)
    if mapped:
        return mapped
    return "predicted"


def iter_all_aliases() -> Iterable[str]:
    """Return all known aliases for canonical allergens."""

    return _ALIAS_LOOKUP.keys()
