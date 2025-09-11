import cloudinary
import cloudinary.uploader
from cloudinary.utils import cloudinary_url
import os
from typing import Dict, Optional


class StorageService:
    def __init__(self):
        # Cloudinary for images - automatically configures from CLOUDINARY_URL
        # CLOUDINARY_URL format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
        cloudinary.config()
        
        # Verify Cloudinary is configured
        if not os.getenv("CLOUDINARY_URL"):
            raise RuntimeError("CLOUDINARY_URL environment variable is required")

    def upload_image(self, file, folder: str = "images") -> Dict:
        """Upload image to Cloudinary with optimization"""
        result = cloudinary.uploader.upload(
            file,
            folder=folder,
            resource_type="image",
            eager=[
                {"width": 300, "height": 300, "crop": "fill", "quality": "auto"},
                {"width": 1200, "quality": "auto"},
            ],
            eager_async=True,
            transformation={"quality": "auto", "fetch_format": "auto"},
        )

        return {
            "storage_type": "cloudinary",
            "storage_id": result["public_id"],
            "url": result["secure_url"],
            "thumbnail_url": (
                result["eager"][0]["secure_url"] if result.get("eager") else None
            ),
            "width": result["width"],
            "height": result["height"],
            "format": result["format"],
            "bytes": result["bytes"],
        }

    def delete_image(self, cloudinary_public_id: str) -> bool:
        """Delete image from Cloudinary"""
        try:
            result = cloudinary.uploader.destroy(cloudinary_public_id)
            return result.get("result") == "ok"
        except Exception as e:
            print(f"Error deleting image from Cloudinary: {e}")
            return False


# Singleton instance
storage_service = StorageService()
