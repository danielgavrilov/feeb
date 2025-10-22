from __future__ import annotations

import base64
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple
from uuid import uuid4

import httpx
from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..config import settings
from .. import dal
from ..models import (
    MenuUpload,
    MenuUploadCreateResponse,
    MenuUploadRecipe,
    MenuUploadRecipeResponse,
    MenuUploadSourceType,
    MenuUploadStage,
    MenuUploadStageName,
    MenuUploadStageResponse,
    MenuUploadStageStatus,
    MenuUploadStatus,
    MenuUploadResponse,
)


class MenuUploadService:
    """Service orchestrating the menu upload LLM pipeline."""

    def __init__(
        self,
        storage_dir: Optional[str] = None,
        extraction_url: Optional[str] = None,
        recipe_deduction_url: Optional[str] = None,
        api_key: Optional[str] = None,
    ) -> None:
        base_dir = Path(storage_dir or settings.menu_upload_storage_dir)
        if not base_dir.is_absolute():
            base_dir = Path(settings.menu_upload_storage_dir).resolve()
        base_dir.mkdir(parents=True, exist_ok=True)
        self.storage_dir = base_dir
        self._extraction_url_override = extraction_url
        self._recipe_deduction_url_override = recipe_deduction_url
        self._api_key_override = api_key

    @property
    def extraction_url(self) -> Optional[str]:
        """Get extraction URL, checking override first then settings."""
        return self._extraction_url_override or settings.llm_extraction_url

    @property
    def recipe_deduction_url(self) -> Optional[str]:
        """Get recipe deduction URL, checking override first then settings."""
        return self._recipe_deduction_url_override or settings.llm_recipe_deduction_url

    @property
    def api_key(self) -> Optional[str]:
        """Get API key, checking override first then settings."""
        return self._api_key_override or settings.llm_api_key

    async def create_upload(
        self,
        session: AsyncSession,
        *,
        restaurant_id: Optional[int],
        user_id: Optional[int],
        source_type: MenuUploadSourceType,
        file: Optional[UploadFile] = None,
        url: Optional[str] = None,
    ) -> MenuUpload:
        """Persist upload metadata and stage records."""

        normalized_type = self._normalize_source_type(source_type)

        if restaurant_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="restaurant_id is required")

        if normalized_type == MenuUploadSourceType.URL and not url:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="URL is required for URL uploads")
        if normalized_type != MenuUploadSourceType.URL and not file:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File upload is required")

        source_value = url or await self._store_file(file)  # type: ignore[arg-type]

        upload = MenuUpload(
            restaurant_id=restaurant_id,
            user_id=user_id,
            source_type=normalized_type.value,
            source_value=source_value,
            status=MenuUploadStatus.PROCESSING.value,
        )
        session.add(upload)
        await session.flush()

        # Create stage records
        for stage_name in MenuUploadStageName:
            stage = MenuUploadStage(
                menu_upload=upload,
                stage=stage_name.value,
            )
            if stage_name == MenuUploadStageName.STAGE_0:
                self._update_stage_record(stage, MenuUploadStageStatus.COMPLETED, details={"source": source_value})
                upload.stage0_completed_at = datetime.utcnow()
            session.add(stage)
        await session.flush()
        await session.refresh(upload, attribute_names=["stages"])

        return upload

    async def process_upload(
        self,
        session: AsyncSession,
        upload: MenuUpload,
    ) -> MenuUploadCreateResponse:
        """Run stage 1 and stage 2 for the provided upload."""

        stage_map = {stage.stage: stage for stage in upload.stages}

        stage1 = stage_map.get(MenuUploadStageName.STAGE_1.value)
        stage2 = stage_map.get(MenuUploadStageName.STAGE_2.value)

        if stage1 is None or stage2 is None:
            raise HTTPException(status_code=500, detail="Upload stages not initialised")

        created_recipes: List[Tuple[int, str]] = []

        # Stage 1 - LLM extraction
        self._update_stage_record(stage1, MenuUploadStageStatus.RUNNING)
        await session.flush()

        try:
            extraction_results = await self._call_extraction_service(
                upload.source_type,
                upload.source_value,
            )
        except Exception as exc:  # pylint: disable=broad-except
            self._update_stage_record(stage1, MenuUploadStageStatus.FAILED, error=str(exc))
            upload.status = MenuUploadStatus.FAILED.value
            upload.error_message = f"Stage 1 failed: {exc}"
            await session.flush()
            raise

        for item in extraction_results:
            name = self._safe_string(item.get("name") or item.get("title"))
            if not name:
                continue

            description = self._safe_string(item.get("description"))
            menu_category = self._safe_string(item.get("category") or item.get("section"))
            options_raw = item.get("options") or item.get("extras")
            options = json.dumps(options_raw) if options_raw else None
            notes = self._safe_string(item.get("special_notes") or item.get("notes"))
            prominence = self._parse_float(item.get("prominence") or item.get("score"))

            section = await dal.get_or_create_menu_section_by_name(
                session,
                upload.restaurant_id,
                menu_category,
            )

            recipe_id = await dal.create_recipe(
                session,
                restaurant_id=upload.restaurant_id,
                name=name,
                description=description,
                instructions=self._safe_string(item.get("instructions")),
                serving_size=self._safe_string(item.get("serving_size")),
                price=self._safe_string(item.get("price")),
                image=self._safe_string(item.get("image")),
                options=options,
                special_notes=notes,
                prominence_score=prominence,
                confirmed=False,
                menu_section_ids=[section.id] if section else None,
            )
            created_recipes.append((recipe_id, name))
            session.add(
                MenuUploadRecipe(
                    menu_upload=upload,
                    recipe_id=recipe_id,
                    stage=MenuUploadStageName.STAGE_1.value,
                )
            )

        upload.stage1_completed_at = datetime.utcnow()
        self._update_stage_record(
            stage1,
            MenuUploadStageStatus.COMPLETED,
            details={"recipes_created": len(created_recipes)},
        )
        await session.flush()

        # Stage 2 - ingredient deduction
        if created_recipes:
            self._update_stage_record(stage2, MenuUploadStageStatus.RUNNING)
            await session.flush()

            try:
                # Smart approach: test with small batch first, then process all if successful
                # This saves tokens while still being safe
                test_batch_size = 5
                
                if len(created_recipes) <= test_batch_size:
                    # Small enough, just process all
                    recipes_for_deduction = [
                        {"name": name, "recipe_id": recipe_id}
                        for recipe_id, name in created_recipes
                    ]
                    ingredient_payload = await self._call_recipe_deduction(recipes_for_deduction)
                    added_count = await self._store_deduced_ingredients(
                        session,
                        created_recipes,
                        ingredient_payload,
                    )
                else:
                    # Test with first 5 recipes
                    test_batch = created_recipes[:test_batch_size]
                    test_recipes = [
                        {"name": name, "recipe_id": recipe_id}
                        for recipe_id, name in test_batch
                    ]
                    
                    # If test succeeds, process all remaining recipes
                    test_payload = await self._call_recipe_deduction(test_recipes)
                    test_added = await self._store_deduced_ingredients(
                        session,
                        test_batch,
                        test_payload,
                    )
                    
                    # Test passed, now process all remaining recipes in one call
                    remaining_recipes = created_recipes[test_batch_size:]
                    remaining_for_deduction = [
                        {"name": name, "recipe_id": recipe_id}
                        for recipe_id, name in remaining_recipes
                    ]
                    
                    remaining_payload = await self._call_recipe_deduction(remaining_for_deduction)
                    remaining_added = await self._store_deduced_ingredients(
                        session,
                        remaining_recipes,
                        remaining_payload,
                    )
                    
                    added_count = test_added + remaining_added
                    
            except Exception as exc:
                self._update_stage_record(stage2, MenuUploadStageStatus.FAILED, error=str(exc))
                upload.status = MenuUploadStatus.FAILED.value
                upload.error_message = f"Stage 2 failed: {exc}"
                await session.flush()
                raise

            upload.stage2_completed_at = datetime.utcnow()
            self._update_stage_record(
                stage2,
                MenuUploadStageStatus.COMPLETED,
                details={"ingredients_added": added_count},
            )
            await session.flush()
        else:
            # No recipes to process
            self._update_stage_record(
                stage2,
                MenuUploadStageStatus.SKIPPED,
                details={"reason": "No recipes created in Stage 1"},
            )
            upload.stage2_completed_at = datetime.utcnow()
            await session.flush()

        upload.status = MenuUploadStatus.COMPLETED.value
        upload.error_message = None
        await session.flush()

        refreshed = await self.fetch_upload(session, upload.id)
        if refreshed is None:
            raise HTTPException(status_code=500, detail="Failed to load upload details")

        return self._build_response(refreshed, [rid for rid, _ in created_recipes])

    async def fetch_upload(self, session: AsyncSession, upload_id: int) -> Optional[MenuUpload]:
        """Load upload with relationships for API responses."""

        result = await session.execute(
            select(MenuUpload)
            .where(MenuUpload.id == upload_id)
            .options(
                selectinload(MenuUpload.stages),
                selectinload(MenuUpload.recipes),
            )
        )
        upload = result.scalar_one_or_none()
        if upload:
            # Ensure recipes are ordered by id for deterministic responses
            upload.stages.sort(key=lambda s: s.stage)
            upload.recipes.sort(key=lambda r: r.recipe_id)
        return upload

    async def list_uploads_for_restaurant(
        self,
        session: AsyncSession,
        restaurant_id: int,
    ) -> List[MenuUploadResponse]:
        """Return uploads for a restaurant."""

        result = await session.execute(
            select(MenuUpload)
            .where(MenuUpload.restaurant_id == restaurant_id)
            .options(
                selectinload(MenuUpload.stages),
                selectinload(MenuUpload.recipes),
            )
            .order_by(MenuUpload.created_at.desc())
        )
        uploads = result.scalars().all()
        responses: List[MenuUploadResponse] = []
        for upload in uploads:
            upload.stages.sort(key=lambda s: s.stage)
            upload.recipes.sort(key=lambda r: r.recipe_id)
            responses.append(self.build_summary(upload))
        return responses

    async def _store_deduced_ingredients(
        self,
        session: AsyncSession,
        recipes: Sequence[Tuple[int, str]],
        deduction_payload: Dict,
    ) -> int:
        """Persist ingredient predictions into recipe_ingredient records."""

        recipe_lookup = {name.lower(): recipe_id for recipe_id, name in recipes}
        added = 0

        recipes_data = deduction_payload.get("recipes") if isinstance(deduction_payload, dict) else None
        if not recipes_data:
            return added

        for recipe_entry in recipes_data:
            recipe_name = self._safe_string(recipe_entry.get("name"))
            if not recipe_name:
                continue
            recipe_id = recipe_lookup.get(recipe_name.lower())
            if recipe_id is None:
                continue

            ingredients = recipe_entry.get("ingredients") or []
            for ingredient in ingredients:
                name = self._safe_string(ingredient.get("name") or ingredient.get("ingredient"))
                if not name:
                    continue
                quantity = self._parse_float(ingredient.get("quantity"))
                unit = self._safe_string(ingredient.get("unit"))
                notes = self._safe_string(ingredient.get("notes"))
                allergens = ingredient.get("allergens")
                allergen_serialized: Optional[str]
                if allergens is None:
                    allergen_serialized = None
                elif isinstance(allergens, (list, dict)):
                    allergen_serialized = json.dumps(allergens)
                else:
                    allergen_serialized = json.dumps([allergens])

                ingredient_code = f"llm:{uuid4().hex}"
                ingredient_id = await dal.insert_ingredient(
                    session,
                    code=ingredient_code,
                    name=name,
                    source="llm",
                )

                await dal.add_recipe_ingredient(
                    session,
                    recipe_id=recipe_id,
                    ingredient_id=ingredient_id,
                    quantity=quantity,
                    unit=unit,
                    notes=notes,
                    allergens=allergen_serialized,
                    confirmed=False,
                )
                added += 1

        return added

    async def _call_extraction_service(self, source_type: str, source_value: str) -> List[Dict]:
        if not self.extraction_url:
            raise HTTPException(status_code=503, detail="LLM extraction service not configured")

        payload: Dict[str, object] = {"source_type": source_type}

        if source_type == MenuUploadSourceType.URL.value:
            payload["url"] = source_value
        else:
            payload["filename"] = Path(source_value).name
            payload["content_base64"] = self._read_base64(Path(source_value))

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(self.extraction_url, json=payload, headers=self._auth_headers())
            response.raise_for_status()
            data = response.json()

        recipes = data.get("recipes") or data.get("items") or []
        if not isinstance(recipes, list):
            raise HTTPException(status_code=502, detail="Unexpected response format from extraction service")
        return recipes

    async def _call_recipe_deduction(self, recipes: Sequence[Dict]) -> Dict:
        if not self.recipe_deduction_url:
            raise HTTPException(status_code=503, detail="LLM recipe deduction service not configured")

        payload = {"recipes": recipes}
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(self.recipe_deduction_url, json=payload, headers=self._auth_headers())
            response.raise_for_status()
            data = response.json()
        if not isinstance(data, dict):
            raise HTTPException(status_code=502, detail="Unexpected response from recipe deduction service")
        return data

    def _auth_headers(self) -> Dict[str, str]:
        headers: Dict[str, str] = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    async def _store_file(self, upload_file: UploadFile) -> str:
        suffix = Path(upload_file.filename or "").suffix
        target_name = f"{uuid4().hex}{suffix}"
        target_path = self.storage_dir / target_name
        content = await upload_file.read()
        target_path.write_bytes(content)
        return str(target_path)

    def _read_base64(self, path: Path) -> str:
        data = path.read_bytes()
        return base64.b64encode(data).decode("utf-8")

    def _normalize_source_type(self, source_type: MenuUploadSourceType | str) -> MenuUploadSourceType:
        if isinstance(source_type, MenuUploadSourceType):
            return source_type
        try:
            return MenuUploadSourceType(source_type)
        except ValueError as exc:  # pragma: no cover - defensive
            raise HTTPException(status_code=400, detail=f"Unsupported source type: {source_type}") from exc

    def _update_stage_record(
        self,
        stage: MenuUploadStage,
        status_value: MenuUploadStageStatus,
        *,
        details: Optional[Dict] = None,
        error: Optional[str] = None,
    ) -> None:
        now = datetime.utcnow()
        stage.status = status_value.value
        if status_value == MenuUploadStageStatus.RUNNING:
            stage.started_at = now
        if status_value in {
            MenuUploadStageStatus.COMPLETED,
            MenuUploadStageStatus.FAILED,
            MenuUploadStageStatus.SKIPPED,
        }:
            stage.completed_at = now
        if details is not None:
            stage.details = json.dumps(details)
        if error is not None:
            stage.error_message = error

    def _safe_string(self, value: Optional[object]) -> Optional[str]:
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return str(value)
        text = str(value).strip()
        return text or None

    def _parse_float(self, value: Optional[object]) -> Optional[float]:
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    def _build_response(self, upload: MenuUpload, recipe_ids: Sequence[int]) -> MenuUploadCreateResponse:
        return MenuUploadCreateResponse(
            id=upload.id,
            restaurant_id=upload.restaurant_id,
            user_id=upload.user_id,
            source_type=upload.source_type,
            source_value=upload.source_value,
            status=upload.status,
            error_message=upload.error_message,
            created_at=upload.created_at,
            updated_at=upload.updated_at,
            stage0_completed_at=upload.stage0_completed_at,
            stage1_completed_at=upload.stage1_completed_at,
            stage2_completed_at=upload.stage2_completed_at,
            stages=[MenuUploadStageResponse.model_validate(stage) for stage in upload.stages],
            recipes=[MenuUploadRecipeResponse.model_validate(link) for link in upload.recipes],
            created_recipe_ids=list(recipe_ids),
        )

    def build_summary(self, upload: MenuUpload) -> MenuUploadResponse:
        return MenuUploadResponse(
            id=upload.id,
            restaurant_id=upload.restaurant_id,
            user_id=upload.user_id,
            source_type=upload.source_type,
            source_value=upload.source_value,
            status=upload.status,
            error_message=upload.error_message,
            created_at=upload.created_at,
            updated_at=upload.updated_at,
            stage0_completed_at=upload.stage0_completed_at,
            stage1_completed_at=upload.stage1_completed_at,
            stage2_completed_at=upload.stage2_completed_at,
            stages=[MenuUploadStageResponse.model_validate(stage) for stage in upload.stages],
            recipes=[MenuUploadRecipeResponse.model_validate(link) for link in upload.recipes],
        )


menu_upload_service = MenuUploadService()
