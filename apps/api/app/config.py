"""
Configuration management using pydantic-settings.
Loads environment variables from .env file.
"""

from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    database_url: str
    
    # OpenFoodFacts
    off_base_url: str = "https://world.openfoodfacts.org"
    data_source: str = "off"
    sample_product_limit: int = 0  # 0 = no limit, import all products

    # Menu upload + LLM services
    menu_upload_storage_dir: str = "uploaded_menus"
    llm_extraction_url: Optional[str] = None
    llm_recipe_deduction_url: Optional[str] = None
    llm_api_key: Optional[str] = None
    # Gemini (Stage 1 extraction and Stage 2 ingredient deduction)
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-flash-lite-latest"

    # API
    api_title: str = "Allergen-Aware Ingredient API"
    api_version: str = "0.1.0"
    api_description: str = "REST API for ingredient and allergen lookups using OpenFoodFacts data"
    cors_allow_origins: List[str] = ["http://localhost:8080"]
    cors_allow_credentials: bool = True
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )


# Global settings instance
settings = Settings()

