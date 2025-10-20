"""
SQLAlchemy ORM models for ingredients, allergens, and products.
"""

from datetime import datetime
from typing import List, Optional
from enum import Enum
from sqlalchemy import (
    Column, Integer, String, TIMESTAMP, ForeignKey,
    DECIMAL, UniqueConstraint, Index, func, Boolean, Text, Float, JSON
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from pydantic import BaseModel, ConfigDict
from .database import Base


# ============================================================================
# SQLAlchemy ORM Models
# ============================================================================

class Ingredient(Base):
    """OFF taxonomy ingredient with hierarchical structure."""
    __tablename__ = "ingredient"
    
    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    code = mapped_column(String(255), unique=True, nullable=False, index=True)
    name = mapped_column(String(500), nullable=False, index=True)
    parent_code = mapped_column(String(255), nullable=True)
    allergen_code = mapped_column(String(255), nullable=True)
    source = mapped_column(String(50), nullable=False, default="off", index=True)
    last_updated = mapped_column(TIMESTAMP, default=func.now(), onupdate=func.now())
    
    # Relationships
    allergens: Mapped[List["IngredientAllergen"]] = relationship(
        "IngredientAllergen", back_populates="ingredient", cascade="all, delete-orphan"
    )
    product_links: Mapped[List["ProductIngredient"]] = relationship(
        "ProductIngredient", back_populates="ingredient", cascade="all, delete-orphan"
    )


class Allergen(Base):
    """Allergen taxonomy from OpenFoodFacts."""
    __tablename__ = "allergen"

    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    code = mapped_column(String(255), unique=True, nullable=False, index=True)
    name = mapped_column(String(500), nullable=False, index=True)
    category = mapped_column(String(100), nullable=True)
    severity_level = mapped_column(String(50), nullable=True)

    # Relationships
    ingredients: Mapped[List["IngredientAllergen"]] = relationship(
        "IngredientAllergen", back_populates="allergen", cascade="all, delete-orphan"
    )
    product_links: Mapped[List["ProductAllergen"]] = relationship(
        "ProductAllergen", back_populates="allergen", cascade="all, delete-orphan"
    )


class AllergenBadge(Base):
    """Curated allergen badges with SVG icons."""

    __tablename__ = "allergen_badge"

    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    code = mapped_column(String(100), unique=True, nullable=False, index=True)
    name = mapped_column(String(255), nullable=False)
    category = mapped_column(String(50), nullable=False, default="allergen")
    keywords = mapped_column(JSON, nullable=False, default=list)
    icon_svg = mapped_column(Text, nullable=False)
    sort_order = mapped_column(Integer, nullable=False, default=0)


class IngredientAllergen(Base):
    """Many-to-many link between ingredients and allergens."""
    __tablename__ = "ingredient_allergen"
    
    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    ingredient_id = mapped_column(Integer, ForeignKey("ingredient.id"), nullable=False)
    allergen_id = mapped_column(Integer, ForeignKey("allergen.id"), nullable=False)
    certainty = mapped_column(String(50), default="direct")  # direct, inferred, possible
    source = mapped_column(String(50), nullable=False, default="off")
    
    # Relationships
    ingredient: Mapped["Ingredient"] = relationship("Ingredient", back_populates="allergens")
    allergen: Mapped["Allergen"] = relationship("Allergen", back_populates="ingredients")
    
    __table_args__ = (
        UniqueConstraint("ingredient_id", "allergen_id", "source", name="uq_ingredient_allergen_source"),
    )


class Product(Base):
    """Product information from OpenFoodFacts."""
    __tablename__ = "product"

    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    barcode = mapped_column(String(50), unique=True, nullable=False, index=True)
    name = mapped_column(String(500), nullable=False)
    brand = mapped_column(String(255), nullable=True)
    lang = mapped_column(String(10), default="en")
    created_at = mapped_column(TIMESTAMP, default=func.now())
    last_modified_at = mapped_column(TIMESTAMP, nullable=True)
    
    # Newly added denormalized fields for analysis/querying
    nutriscore_grade = mapped_column(String(10), nullable=True)
    nutriscore_score = mapped_column(Integer, nullable=True)
    quantity_raw = mapped_column(String(100), nullable=True)
    quantity_amount = mapped_column(DECIMAL(10, 3), nullable=True)
    quantity_unit = mapped_column(String(20), nullable=True)
    categories_text = mapped_column(Text, nullable=True)
    
    # Completeness flags
    has_allergens = mapped_column(Boolean, default=False, nullable=False)
    has_traces = mapped_column(Boolean, default=False, nullable=False)
    has_ingredients = mapped_column(Boolean, default=False, nullable=False)
    has_nutrition = mapped_column(Boolean, default=False, nullable=False)
    is_complete = mapped_column(Boolean, default=False, nullable=False)
    allergen_data_incomplete = mapped_column(Boolean, default=False, nullable=False)
    
    # Relationships
    ingredients: Mapped[List["ProductIngredient"]] = relationship(
        "ProductIngredient", back_populates="product", cascade="all, delete-orphan"
    )
    allergens: Mapped[List["ProductAllergen"]] = relationship(
        "ProductAllergen", back_populates="product", cascade="all, delete-orphan"
    )
    nutrition: Mapped[Optional["ProductNutrition"]] = relationship(
        "ProductNutrition", back_populates="product", uselist=False, cascade="all, delete-orphan"
    )


class ProductIngredient(Base):
    """Many-to-many link between products and ingredients."""
    __tablename__ = "product_ingredient"
    
    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id = mapped_column(Integer, ForeignKey("product.id"), nullable=False)
    ingredient_id = mapped_column(Integer, ForeignKey("ingredient.id"), nullable=False)
    percent_estimate = mapped_column(DECIMAL(5, 2), nullable=True)
    rank = mapped_column(Integer, nullable=True)
    
    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="ingredients")
    ingredient: Mapped["Ingredient"] = relationship("Ingredient", back_populates="product_links")
    
    __table_args__ = (
        UniqueConstraint("product_id", "ingredient_id", name="uq_product_ingredient"),
    )


class ProductAllergen(Base):
    """Denormalized product-allergen link for fast lookups."""
    __tablename__ = "product_allergen"
    
    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id = mapped_column(Integer, ForeignKey("product.id"), nullable=False)
    allergen_id = mapped_column(Integer, ForeignKey("allergen.id"), nullable=False)
    relation_type = mapped_column(String(50), nullable=False)  # contains, may_contain, traces
    source = mapped_column(String(50), nullable=False, default="off")
    
    # Relationships
    product: Mapped["Product"] = relationship("Product", back_populates="allergens")
    allergen: Mapped["Allergen"] = relationship("Allergen", back_populates="product_links")
    
    __table_args__ = (
        UniqueConstraint("product_id", "allergen_id", "relation_type", name="uq_product_allergen_relation"),
    )


# New table: product nutritional values per 100g/ml
class ProductNutrition(Base):
    __tablename__ = "product_nutrition"
    
    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id = mapped_column(Integer, ForeignKey("product.id"), unique=True, nullable=False)
    
    fat_100g = mapped_column(DECIMAL(10, 3), nullable=True)
    saturated_fat_100g = mapped_column(DECIMAL(10, 3), nullable=True)
    carbohydrates_100g = mapped_column(DECIMAL(10, 3), nullable=True)
    sugars_100g = mapped_column(DECIMAL(10, 3), nullable=True)
    fiber_100g = mapped_column(DECIMAL(10, 3), nullable=True)
    proteins_100g = mapped_column(DECIMAL(10, 3), nullable=True)
    salt_100g = mapped_column(DECIMAL(10, 3), nullable=True)
    
    product: Mapped["Product"] = relationship("Product", back_populates="nutrition")


# ============================================================================
# Recipe System Models
# ============================================================================

class AppUser(Base):
    """Application user synced from Supabase auth."""
    __tablename__ = "app_user"
    
    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    supabase_uid = mapped_column(String(255), unique=True, nullable=False, index=True)
    email = mapped_column(Text, unique=True, nullable=False)
    name = mapped_column(Text, nullable=True)
    created_at = mapped_column(TIMESTAMP, default=func.now())
    
    # Relationships
    restaurants: Mapped[List["UserRestaurant"]] = relationship(
        "UserRestaurant", back_populates="user", cascade="all, delete-orphan"
    )


class Restaurant(Base):
    """Restaurant information."""
    __tablename__ = "restaurant"
    
    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    name = mapped_column(Text, nullable=False)
    description = mapped_column(Text, nullable=True)
    created_at = mapped_column(TIMESTAMP, default=func.now())
    
    # Relationships
    users: Mapped[List["UserRestaurant"]] = relationship(
        "UserRestaurant", back_populates="restaurant", cascade="all, delete-orphan"
    )
    menus: Mapped[List["Menu"]] = relationship(
        "Menu", back_populates="restaurant", cascade="all, delete-orphan"
    )
    recipes: Mapped[List["Recipe"]] = relationship(
        "Recipe", back_populates="restaurant", cascade="all, delete-orphan"
    )


class UserRestaurant(Base):
    """Many-to-many link between users and restaurants."""
    __tablename__ = "user_restaurant"
    
    user_id = mapped_column(Integer, ForeignKey("app_user.id"), primary_key=True)
    restaurant_id = mapped_column(Integer, ForeignKey("restaurant.id"), primary_key=True)
    role = mapped_column(Text, default="owner")
    
    # Relationships
    user: Mapped["AppUser"] = relationship("AppUser", back_populates="restaurants")
    restaurant: Mapped["Restaurant"] = relationship("Restaurant", back_populates="users")


class Menu(Base):
    """Menu information."""
    __tablename__ = "menu"
    
    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    restaurant_id = mapped_column(Integer, ForeignKey("restaurant.id"), nullable=False)
    name = mapped_column(Text, nullable=False)
    description = mapped_column(Text, nullable=True)
    menu_active = mapped_column(Integer, default=1)
    created_at = mapped_column(TIMESTAMP, default=func.now())
    
    # Relationships
    restaurant: Mapped["Restaurant"] = relationship("Restaurant", back_populates="menus")
    recipes: Mapped[List["MenuRecipe"]] = relationship(
        "MenuRecipe", back_populates="menu", cascade="all, delete-orphan"
    )


class Recipe(Base):
    """Recipe information."""
    __tablename__ = "recipe"

    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    restaurant_id = mapped_column(Integer, ForeignKey("restaurant.id"), nullable=False)
    name = mapped_column(Text, nullable=False)
    description = mapped_column(Text, nullable=True)
    instructions = mapped_column(Text, nullable=True)
    menu_category = mapped_column(Text, nullable=True)
    serving_size = mapped_column(Text, nullable=True)
    price = mapped_column(Text, nullable=True)
    image = mapped_column(Text, nullable=True)
    options = mapped_column(Text, nullable=True)
    special_notes = mapped_column(Text, nullable=True)
    prominence_score = mapped_column(Float, nullable=True)
    confirmed = mapped_column(Boolean, nullable=False, default=False)
    is_on_menu = mapped_column(Boolean, nullable=False, default=False)
    created_at = mapped_column(TIMESTAMP, default=func.now())
    
    # Relationships
    restaurant: Mapped["Restaurant"] = relationship("Restaurant", back_populates="recipes")
    menus: Mapped[List["MenuRecipe"]] = relationship(
        "MenuRecipe", back_populates="recipe", cascade="all, delete-orphan"
    )
    ingredients: Mapped[List["RecipeIngredient"]] = relationship(
        "RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan"
    )


class MenuRecipe(Base):
    """Many-to-many link between menus and recipes."""
    __tablename__ = "menu_recipe"
    
    menu_id = mapped_column(Integer, ForeignKey("menu.id"), primary_key=True)
    recipe_id = mapped_column(Integer, ForeignKey("recipe.id"), primary_key=True)
    position = mapped_column(Integer, nullable=True)
    
    # Relationships
    menu: Mapped["Menu"] = relationship("Menu", back_populates="recipes")
    recipe: Mapped["Recipe"] = relationship("Recipe", back_populates="menus")


class RecipeIngredient(Base):
    """Links recipes to ingredients with quantity information."""
    __tablename__ = "recipe_ingredient"
    
    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    recipe_id = mapped_column(Integer, ForeignKey("recipe.id"), nullable=False)
    ingredient_id = mapped_column(Integer, ForeignKey("ingredient.id"), nullable=False)
    quantity = mapped_column(DECIMAL(10, 3), nullable=True)
    unit = mapped_column(Text, nullable=True)
    notes = mapped_column(Text, nullable=True)
    allergens = mapped_column(Text, nullable=True)
    confirmed = mapped_column(Boolean, nullable=False, default=False)
    
    # Relationships
    recipe: Mapped["Recipe"] = relationship("Recipe", back_populates="ingredients")
    ingredient: Mapped["Ingredient"] = relationship("Ingredient")
    
    __table_args__ = (
        UniqueConstraint("recipe_id", "ingredient_id", name="uq_recipe_ingredient"),
    )


# ============================================================================
# Pydantic Response Models
# ============================================================================

class AllergenResponse(BaseModel):
    """Allergen information in API responses."""
    code: str
    name: str
    certainty: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AllergenBadgeResponse(BaseModel):
    """Serialized allergen badge with icon metadata."""

    code: str
    name: str
    category: str
    keywords: List[str]
    icon_svg: str
    sort_order: int

    model_config = ConfigDict(from_attributes=True)


class IngredientResponse(BaseModel):
    """Ingredient information in API responses."""
    code: str
    name: str
    source: str
    last_updated: datetime
    
    model_config = ConfigDict(from_attributes=True)


class IngredientWithAllergens(BaseModel):
    """Ingredient with associated allergens."""
    ingredient: IngredientResponse
    allergens: List[AllergenResponse]


class ProductIngredientResponse(BaseModel):
    """Product ingredient with rank."""
    name: str
    rank: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)


class ProductAllergenResponse(BaseModel):
    """Product allergen with relation type."""
    name: str
    relation_type: str
    
    model_config = ConfigDict(from_attributes=True)


class ProductResponse(BaseModel):
    """Product basic information."""
    barcode: str
    name: str
    brand: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class ProductWithDetails(BaseModel):
    """Product with ingredients and allergens."""
    product: ProductResponse
    ingredients: List[ProductIngredientResponse]
    allergens: List[ProductAllergenResponse]


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    db_connected: bool


# ============================================================================
# Recipe System Pydantic Models
# ============================================================================

class UserCreate(BaseModel):
    """Request model for creating/syncing a user."""
    supabase_uid: str
    email: str
    name: Optional[str] = None


class UserResponse(BaseModel):
    """User information in API responses."""
    id: int
    supabase_uid: str
    email: str
    name: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class RestaurantCreate(BaseModel):
    """Request model for creating a restaurant."""
    name: str
    description: Optional[str] = None
    user_id: int


class RestaurantResponse(BaseModel):
    """Restaurant information in API responses."""
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class MenuCreate(BaseModel):
    """Request model for creating a menu."""
    restaurant_id: int
    name: str
    description: Optional[str] = None
    menu_active: Optional[int] = 1


class MenuResponse(BaseModel):
    """Menu information in API responses."""
    id: int
    restaurant_id: int
    name: str
    description: Optional[str] = None
    menu_active: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class RecipeIngredientRequest(BaseModel):
    """Request model for adding ingredient to recipe."""
    ingredient_id: int
    quantity: Optional[float] = None
    unit: Optional[str] = None
    notes: Optional[str] = None
    confirmed: Optional[bool] = None


class RecipeIngredientResponse(BaseModel):
    """Recipe ingredient with details."""
    ingredient_id: int
    ingredient_name: str
    quantity: Optional[float] = None
    unit: Optional[str] = None
    notes: Optional[str] = None
    allergens: List[AllergenResponse] = []
    confirmed: bool = False

    model_config = ConfigDict(from_attributes=True)


class RecipeCreate(BaseModel):
    """Request model for creating a recipe."""
    restaurant_id: int
    name: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    menu_category: Optional[str] = None
    serving_size: Optional[str] = None
    price: Optional[str] = None
    image: Optional[str] = None
    options: Optional[str] = None
    special_notes: Optional[str] = None
    prominence_score: Optional[float] = None
    confirmed: Optional[bool] = None
    is_on_menu: Optional[bool] = None
    ingredients: Optional[List[RecipeIngredientRequest]] = []


class RecipeUpdate(BaseModel):
    """Request model for updating a recipe."""
    name: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    menu_category: Optional[str] = None
    serving_size: Optional[str] = None
    price: Optional[str] = None
    image: Optional[str] = None
    options: Optional[str] = None
    special_notes: Optional[str] = None
    prominence_score: Optional[float] = None
    confirmed: Optional[bool] = None
    is_on_menu: Optional[bool] = None


class RecipeResponse(BaseModel):
    """Recipe basic information."""
    id: int
    restaurant_id: int
    name: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    menu_category: Optional[str] = None
    serving_size: Optional[str] = None
    price: Optional[str] = None
    image: Optional[str] = None
    options: Optional[str] = None
    special_notes: Optional[str] = None
    prominence_score: Optional[float] = None
    confirmed: bool
    is_on_menu: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RecipeWithIngredients(BaseModel):
    """Recipe with full ingredient details and allergens."""
    id: int
    restaurant_id: int
    name: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    menu_category: Optional[str] = None
    serving_size: Optional[str] = None
    price: Optional[str] = None
    image: Optional[str] = None
    options: Optional[str] = None
    special_notes: Optional[str] = None
    prominence_score: Optional[float] = None
    confirmed: bool
    is_on_menu: bool
    created_at: datetime
    ingredients: List[RecipeIngredientResponse] = []

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Menu upload pipeline models
# ============================================================================


class MenuUploadSourceType(str, Enum):
    """Supported input sources for menu upload."""

    PDF = "pdf"
    IMAGE = "image"
    URL = "url"


class MenuUploadStatus(str, Enum):
    """Overall processing status for a menu upload."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class MenuUploadStageName(str, Enum):
    """Individual pipeline stages."""

    STAGE_0 = "stage_0"
    STAGE_1 = "stage_1"
    STAGE_2 = "stage_2"


class MenuUploadStageStatus(str, Enum):
    """Status for a pipeline stage."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class MenuUpload(Base):
    """Top-level record for uploaded menus."""

    __tablename__ = "menu_upload"

    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    restaurant_id = mapped_column(Integer, ForeignKey("restaurant.id"), nullable=True)
    user_id = mapped_column(Integer, ForeignKey("app_user.id"), nullable=True)
    source_type = mapped_column(String(50), nullable=False)
    source_value = mapped_column(Text, nullable=False)
    status = mapped_column(String(50), nullable=False, default=MenuUploadStatus.PENDING.value)
    error_message = mapped_column(Text, nullable=True)
    stage0_completed_at = mapped_column(TIMESTAMP, nullable=True)
    stage1_completed_at = mapped_column(TIMESTAMP, nullable=True)
    stage2_completed_at = mapped_column(TIMESTAMP, nullable=True)
    created_at = mapped_column(TIMESTAMP, default=func.now())
    updated_at = mapped_column(TIMESTAMP, default=func.now(), onupdate=func.now())

    restaurant: Mapped[Optional["Restaurant"]] = relationship("Restaurant")
    user: Mapped[Optional["AppUser"]] = relationship("AppUser")
    stages: Mapped[List["MenuUploadStage"]] = relationship(
        "MenuUploadStage", back_populates="menu_upload", cascade="all, delete-orphan"
    )
    recipes: Mapped[List["MenuUploadRecipe"]] = relationship(
        "MenuUploadRecipe", back_populates="menu_upload", cascade="all, delete-orphan"
    )


class MenuUploadStage(Base):
    """Track the status of each stage in the pipeline."""

    __tablename__ = "menu_upload_stage"

    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    menu_upload_id = mapped_column(Integer, ForeignKey("menu_upload.id"), nullable=False)
    stage = mapped_column(String(50), nullable=False)
    status = mapped_column(String(50), nullable=False, default=MenuUploadStageStatus.PENDING.value)
    started_at = mapped_column(TIMESTAMP, nullable=True)
    completed_at = mapped_column(TIMESTAMP, nullable=True)
    error_message = mapped_column(Text, nullable=True)
    details = mapped_column(Text, nullable=True)

    menu_upload: Mapped["MenuUpload"] = relationship("MenuUpload", back_populates="stages")

    __table_args__ = (
        UniqueConstraint("menu_upload_id", "stage", name="uq_menu_upload_stage"),
    )


class MenuUploadRecipe(Base):
    """Link created recipes back to their source upload."""

    __tablename__ = "menu_upload_recipe"

    id = mapped_column(Integer, primary_key=True, autoincrement=True)
    menu_upload_id = mapped_column(Integer, ForeignKey("menu_upload.id"), nullable=False)
    recipe_id = mapped_column(Integer, ForeignKey("recipe.id"), nullable=False)
    stage = mapped_column(String(50), nullable=False, default=MenuUploadStageName.STAGE_1.value)

    menu_upload: Mapped["MenuUpload"] = relationship("MenuUpload", back_populates="recipes")
    recipe: Mapped["Recipe"] = relationship("Recipe")

    __table_args__ = (
        UniqueConstraint("menu_upload_id", "recipe_id", name="uq_menu_upload_recipe"),
    )


class MenuUploadStageResponse(BaseModel):
    """Pydantic model for stage status in API responses."""

    stage: str
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    details: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MenuUploadRecipeResponse(BaseModel):
    """Link between a menu upload and created recipes."""

    recipe_id: int
    stage: str

    model_config = ConfigDict(from_attributes=True)


class MenuUploadResponse(BaseModel):
    """Summary response for menu uploads."""

    id: int
    restaurant_id: Optional[int] = None
    user_id: Optional[int] = None
    source_type: str
    source_value: str
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    stage0_completed_at: Optional[datetime] = None
    stage1_completed_at: Optional[datetime] = None
    stage2_completed_at: Optional[datetime] = None
    stages: List[MenuUploadStageResponse] = []
    recipes: List[MenuUploadRecipeResponse] = []

    model_config = ConfigDict(from_attributes=True)


class MenuUploadCreateResponse(MenuUploadResponse):
    """Detailed response returned immediately after processing."""

    created_recipe_ids: List[int] = []

