"""
Tests for FastAPI routes.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.main import app
from app.database import Base, get_db
from app import dal
from app.routes import CANONICAL_ALLERGEN_MARKERS_PROMPT


# Test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def test_session():
    """Create a test database session."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    TestSessionLocal = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with TestSessionLocal() as session:
        yield session
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest.fixture
async def client(test_session):
    """Create test client with dependency override."""
    
    async def override_get_db():
        yield test_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_health_endpoint(client):
    """Test health check endpoint."""
    response = await client.get("/health")
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] in ["ok", "degraded"]
    assert "db_connected" in data


@pytest.mark.asyncio
async def test_root_endpoint(client):
    """Test root endpoint."""
    response = await client.get("/")
    assert response.status_code == 200
    
    data = response.json()
    assert "name" in data
    assert "version" in data


@pytest.mark.asyncio
async def test_get_ingredient_not_found(client):
    """Test ingredient lookup when not found."""
    response = await client.get("/ingredients/nonexistent")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_ingredient_success(client, test_session):
    """Test successful ingredient lookup."""
    # Create allergen and ingredient
    allergen_id = await dal.insert_allergen(
        test_session,
        code="en:gluten",
        name="Gluten"
    )
    
    ingredient_id = await dal.insert_ingredient(
        test_session,
        code="en:wheat-flour",
        name="Wheat flour"
    )
    
    await dal.link_ingredient_allergen(
        test_session,
        ingredient_id=ingredient_id,
        allergen_id=allergen_id,
        certainty="direct"
    )
    
    await test_session.commit()
    
    # Test exact match
    response = await client.get("/ingredients/Wheat flour?exact=true")
    assert response.status_code == 200
    
    data = response.json()
    assert data["ingredient"]["code"] == "en:wheat-flour"
    assert data["ingredient"]["name"] == "Wheat flour"
    assert len(data["allergens"]) == 1
    assert data["allergens"][0]["code"] == "en:gluten"


@pytest.mark.asyncio
async def test_get_product_not_found(client):
    """Test product lookup when not found."""
    response = await client.get("/products/0000000000000")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_product_success(client, test_session):
    """Test successful product lookup."""
    # Create product with ingredients and allergens
    allergen_id = await dal.insert_allergen(
        test_session,
        code="en:milk",
        name="Milk"
    )
    
    ingredient_id = await dal.insert_ingredient(
        test_session,
        code="en:sugar",
        name="Sugar"
    )
    
    product_id = await dal.insert_product(
        test_session,
        barcode="123456789",
        name="Test Product",
        brand="Test Brand"
    )
    
    await dal.link_product_ingredient(
        test_session,
        product_id=product_id,
        ingredient_id=ingredient_id,
        rank=1
    )
    
    await dal.link_product_allergen(
        test_session,
        product_id=product_id,
        allergen_id=allergen_id,
        relation_type="contains"
    )
    
    await test_session.commit()
    
    # Test lookup
    response = await client.get("/products/123456789")
    assert response.status_code == 200
    
    data = response.json()
    assert data["product"]["barcode"] == "123456789"
    assert data["product"]["name"] == "Test Product"
    assert len(data["ingredients"]) == 1
    assert data["ingredients"][0]["name"] == "Sugar"
    assert len(data["allergens"]) == 1
    assert data["allergens"][0]["name"] == "Milk"


@pytest.mark.asyncio
async def test_extract_menu_items_normalization(client, monkeypatch):
    """Ensure menu extraction prompt and normalization cover new schema fields."""

    captured: dict[str, str] = {}

    class FakeGeminiClient:
        def __init__(self):
            self.calls: list[dict] = []

        async def extract_from_payload(self, **kwargs):  # type: ignore[no-untyped-def]
            captured.update({"prompt": kwargs.get("prompt", "")})
            return [
                {
                    "title": "Family Paella",
                    "description": "Seafood rice for sharing",
                    "category": "Mains",
                    "section_header": "Large Plates",
                    "notes": "House speciality",
                    "options": ["Add aioli"],
                    "price": 45,
                    "currency": "EUR",
                    "allergen_notes": "Contains shellfish",
                    "persons": "4 people",
                    "prominence": 0.7,
                },
                {
                    "name": "Espresso",
                    "category": "Drinks",
                },
            ]

    monkeypatch.setattr("app.routes.GeminiClient", FakeGeminiClient)

    payload = {"source_type": "url", "url": "https://example.com/menu"}
    response = await client.post("/llm/extract-menu", json=payload)

    assert response.status_code == 200

    data = response.json()
    assert "recipes" in data
    assert data["recipes"][0]["name"] == "Family Paella"
    assert data["recipes"][0]["section_header"] == "Large Plates"
    assert data["recipes"][0]["allergen_notes"] == "Contains shellfish"
    assert data["recipes"][0]["persons"] == 4
    assert data["recipes"][0]["special_notes"] == "House speciality"
    assert data["recipes"][0]["options"] == ["Add aioli"]
    assert data["recipes"][1]["allergen_notes"] is None
    assert data["recipes"][1]["persons"] is None
    assert data["recipes"][1]["section_header"] is None

    prompt = captured.get("prompt", "")
    assert "allergen" in prompt.lower()
    assert "section" in prompt.lower()
    assert "\"persons\"" in prompt
    assert "strict" in prompt.lower()


@pytest.mark.asyncio
async def test_deduce_ingredients_prompt_enforces_allergen_schema(client, monkeypatch):
    """Stage 2 prompt must pin the canonical markers and schema expectations."""

    captured: dict[str, str] = {}

    class FakeGeminiClient:
        def __init__(self):
            self.calls: list[dict] = []

        async def extract_from_payload(self, **kwargs):  # type: ignore[no-untyped-def]
            captured.update({"prompt": kwargs.get("prompt", "")})
            return {
                "recipes": [
                    {
                        "name": "Margherita Pizza",
                        "ingredients": [
                            {
                                "name": "mozzarella",
                                "quantity": 80,
                                "unit": "g",
                                "allergens": [
                                    {"allergen": "milk", "certainty": "likely"},
                                    {"allergen": "vegan", "certainty": "likely"},
                                ],
                            }
                        ],
                    }
                ]
            }

    monkeypatch.setattr("app.routes.GeminiClient", FakeGeminiClient)

    response = await client.post(
        "/llm/deduce-ingredients",
        json={
            "recipes": [
                {
                    "name": "Margherita Pizza",
                    "recipe_id": 1,
                    "description": "Fresh egg pasta with sage, Parmesan and truffle.",
                    "price": "€18",
                }
            ]
        },
    )

    assert response.status_code == 200

    payload = response.json()
    assert payload["recipes"][0]["ingredients"][0]["allergens"] == [
        {"allergen": "milk", "certainty": "likely"},
        {"allergen": "vegan", "certainty": "likely"},
    ]

    prompt = captured.get("prompt", "")
    assert CANONICAL_ALLERGEN_MARKERS_PROMPT in prompt
    assert "\"allergens\" must be a JSON array of objects" in prompt
    assert "\"certainty\"" in prompt and "likely" in prompt and "possible" in prompt
    assert "Do not use dietary markers" in prompt and "\"vegan\"" in prompt and "\"vegetarian\"" in prompt
    assert "Description: Fresh egg pasta with sage, Parmesan and truffle." in prompt
    assert "Price: €18" in prompt

@pytest.mark.asyncio
async def test_get_menu_sections_endpoint(client, test_session):
    """Menu section endpoint returns persisted sections and archive."""

    user_id = await dal.upsert_user(
        test_session,
        supabase_uid="uid-sections",
        email="sections@example.com",
    )
    restaurant_id = await dal.create_restaurant(
        test_session,
        name="Menu Sections",
        user_id=user_id,
    )
    await dal.get_or_create_menu_section_by_name(test_session, restaurant_id, "Mains")
    await test_session.commit()

    response = await client.get(f"/restaurants/{restaurant_id}/menu-sections")
    assert response.status_code == 200

    payload = response.json()
    assert payload["menu"]["id"] == restaurant_id
    names = {section["name"] for section in payload["sections"]}
    assert "Mains" in names
    assert "Archive" in names


@pytest.mark.asyncio
async def test_update_menu_sections_endpoint(client, test_session):
    """Menu sections can be reordered and renamed via the API."""

    user_id = await dal.upsert_user(
        test_session,
        supabase_uid="uid-update-sections",
        email="update@example.com",
    )
    restaurant_id = await dal.create_restaurant(
        test_session,
        name="Update Menu",
        user_id=user_id,
    )
    mains = await dal.get_or_create_menu_section_by_name(test_session, restaurant_id, "Mains")
    await dal.get_or_create_menu_section_by_name(test_session, restaurant_id, "Drinks")
    await test_session.commit()

    payload = {
        "sections": [
            {"id": mains.id, "name": "Starters", "position": 1},
            {"name": "Specials", "position": 0},
        ]
    }

    response = await client.put(
        f"/restaurants/{restaurant_id}/menu-sections",
        json=payload,
    )
    assert response.status_code == 200

    data = response.json()
    names = [section["name"] for section in data["sections"]]
    assert "Starters" in names
    assert "Specials" in names
    assert "Archive" in names
    assert "Drinks" not in names


@pytest.mark.asyncio
async def test_delete_recipe_ingredient_removes_link(client, test_session):
    """Deleting a recipe ingredient removes it from subsequent loads."""

    user_id = await dal.upsert_app_user(
        test_session,
        supabase_uid="test-user",
        email="user@example.com",
        name="Test User",
    )
    restaurant_id = await dal.create_restaurant(
        test_session,
        name="Test Bistro",
        user_id=user_id,
    )
    recipe_id = await dal.create_recipe(
        test_session,
        restaurant_id=restaurant_id,
        name="Tomato Soup",
    )
    ingredient_id = await dal.insert_ingredient(
        test_session,
        code="en:tomato",
        name="Tomato",
    )

    await dal.add_recipe_ingredient(
        test_session,
        recipe_id=recipe_id,
        ingredient_id=ingredient_id,
        quantity=2,
        unit="pcs",
        confirmed=True,
    )
    await test_session.commit()

    recipe_before = await dal.get_recipe_with_details(test_session, recipe_id)
    assert recipe_before is not None
    assert len(recipe_before["ingredients"]) == 1

    response = await client.delete(
        f"/recipes/{recipe_id}/ingredients/{ingredient_id}"
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"

    await test_session.expire_all()
    recipe_after = await dal.get_recipe_with_details(test_session, recipe_id)
    assert recipe_after is not None
    assert recipe_after["ingredients"] == []

