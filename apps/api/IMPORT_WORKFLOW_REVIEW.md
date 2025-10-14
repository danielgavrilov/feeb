# OpenFoodFacts Import Workflow Review

This note captures the current behaviour of `data_pipeline/import_off.py` and a few follow-up suggestions before wiring it into a daily refresh job.

## What the pipeline does today

* Downloads the official taxonomy exports before streaming the `openfoodfacts-products.jsonl.gz` feed so canonical names and hierarchy metadata are available locally. 【F:ingredient-api/data_pipeline/import_off.py†L41-L114】
* Streams the JSONL feed **once**, inserting taxonomy rows on-demand and linking products, ingredients, and allergens in a single pass. 【F:ingredient-api/data_pipeline/import_off.py†L116-L201】
* Imports every product by default; callers can still pass a limit when they need to sample locally, but setting the environment value to `0` (or calling the loader without a limit) processes the full dataset. 【F:ingredient-api/data_pipeline/import_off.py†L67-L90】【F:ingredient-api/data_pipeline/parsers.py†L64-L108】
* Populates ingredient and allergen display names (plus allergen categories and ingredient parents) from the taxonomy files, falling back to a deterministic formatter only when a code is missing from the export. 【F:ingredient-api/data_pipeline/import_off.py†L41-L201】
* Persists the product `last_modified_t` timestamp, enabling incremental refresh planning and audit trails in the database. 【F:ingredient-api/data_pipeline/parsers.py†L52-L82】【F:ingredient-api/app/dal.py†L212-L247】【F:ingredient-api/app/models.py†L58-L71】

## Remaining gaps before a daily refresh

1. **Evaluate the MongoDB dump when full-history replay matters.** The JSONL stream now ingests the entire dataset with incremental metadata, but the official daily MongoDB export still offers richer history and indexes for large-scale catch-up jobs.
