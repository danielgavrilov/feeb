"""
Utility functions for downloading and decompressing files.
"""

import gzip
import shutil
from pathlib import Path
import httpx
from typing import Optional


async def download_file(url: str, destination: Path, chunk_size: int = 8192) -> None:
    """
    Download a file from URL to destination path.
    
    Args:
        url: Source URL
        destination: Destination file path
        chunk_size: Download chunk size in bytes
    """
    print(f"Downloading {url}...")
    
    async with httpx.AsyncClient(timeout=300.0, follow_redirects=True) as client:
        async with client.stream("GET", url) as response:
            response.raise_for_status()
            
            # Get file size if available
            total_size = int(response.headers.get("content-length", 0))
            downloaded = 0
            
            with open(destination, "wb") as f:
                async for chunk in response.aiter_bytes(chunk_size=chunk_size):
                    f.write(chunk)
                    downloaded += len(chunk)
                    
                    # Show progress
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        print(f"  Progress: {percent:.1f}% ({downloaded}/{total_size} bytes)", end="\r")
    
    print(f"\nDownload complete: {destination}")


def decompress_gz(source: Path, destination: Path) -> None:
    """
    Decompress a .gz file.
    
    Args:
        source: Source .gz file path
        destination: Destination decompressed file path
    """
    print(f"Decompressing {source}...")
    
    with gzip.open(source, "rb") as f_in:
        with open(destination, "wb") as f_out:
            shutil.copyfileobj(f_in, f_out)
    
    print(f"Decompression complete: {destination}")


def ensure_temp_dir() -> Path:
    """
    Ensure temporary directory exists.
    
    Returns:
        Path to temp directory
    """
    temp_dir = Path("temp_data")
    temp_dir.mkdir(exist_ok=True)
    return temp_dir


def cleanup_temp_dir(temp_dir: Path) -> None:
    """
    Remove temporary directory and all contents.
    
    Args:
        temp_dir: Directory to remove
    """
    if temp_dir.exists():
        print(f"Cleaning up {temp_dir}...")
        shutil.rmtree(temp_dir)
        print("Cleanup complete")

