from fastapi import APIRouter
from ..services.ai_service import ai_service

router = APIRouter(prefix="/api", tags=["ai"])


@router.get("/ai/models")
def get_available_models():
    """Get available AI models for selection"""
    return {
        "available": ai_service.is_available(),
        "models": ai_service.get_available_models(),
        "current_model": ai_service.default_model,
        "provider": "OpenRouter" if "openrouter.ai" in ai_service.base_url else "OpenAI"
    }


@router.get("/ai/status")
def get_ai_status():
    """Get AI service status and configuration"""
    return {
        "available": ai_service.is_available(),
        "provider": "OpenRouter" if "openrouter.ai" in ai_service.base_url else "OpenAI",
        "model": ai_service.default_model,
        "configured": bool(ai_service.api_key)
    }
