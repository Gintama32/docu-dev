import cloudinary
import cloudinary.uploader
from cloudinary.utils import cloudinary_url
import os
from typing import Dict, Optional, Tuple


class CloudinaryService:
    def __init__(self):
        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        )

    def upload_image(self, file, folder: str = "images") -> Dict:
        """Upload image with automatic optimization"""
        result = cloudinary.uploader.upload(
            file,
            folder=folder,
            resource_type="image",
            eager=[
                {
                    "width": 300,
                    "height": 300,
                    "crop": "fill",
                    "quality": "auto",
                },  # Thumbnail
                {"width": 1200, "quality": "auto"},  # Display size
            ],
            eager_async=True,
            transformation={"quality": "auto", "fetch_format": "auto"},
        )

        return {
            "public_id": result["public_id"],
            "url": result["secure_url"],
            "thumbnail_url": (
                result["eager"][0]["secure_url"] if result.get("eager") else None
            ),
            "width": result["width"],
            "height": result["height"],
            "format": result["format"],
            "bytes": result["bytes"],
            "resource_type": "image",
        }

    def upload_pdf(self, file, folder: str = "documents") -> Dict:
        """Upload PDF and generate preview"""
        # Upload the PDF
        result = cloudinary.uploader.upload(
            file,
            folder=folder,
            resource_type="raw",
            type="upload",
            access_mode="public",
        )

        # Generate preview of first page
        preview_url, _ = cloudinary_url(
            result["public_id"],
            resource_type="image",
            format="jpg",
            page=1,
            width=300,
            crop="limit",
            flags="attachment",
        )

        return {
            "public_id": result["public_id"],
            "url": result["secure_url"],
            "preview_url": preview_url,
            "format": result["format"],
            "bytes": result["bytes"],
            "pages": result.get("pages", 1),
            "resource_type": "pdf",
        }

    def delete_asset(self, public_id: str, resource_type: str = "image") -> bool:
        """Delete asset from Cloudinary"""
        try:
            result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
            return result.get("result") == "ok"
        except Exception as e:
            print(f"Error deleting asset: {e}")
            return False

    def get_optimized_url(
        self,
        public_id: str,
        width: Optional[int] = None,
        height: Optional[int] = None,
        crop: str = "fill",
    ) -> str:
        """Get optimized URL for image"""
        transformations = {"quality": "auto", "fetch_format": "auto"}

        if width:
            transformations["width"] = width
        if height:
            transformations["height"] = height
        if width or height:
            transformations["crop"] = crop

        url, _ = cloudinary_url(public_id, **transformations)
        return url


# Singleton instance
cloudinary_service = CloudinaryService()
