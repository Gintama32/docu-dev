import os
from typing import Any, Dict, Optional

import httpx


class AIService:
    """
    AI service that uses OpenRouter for flexible model selection.
    Supports multiple models and providers through OpenRouter's API.
    """

    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.base_url = "https://openrouter.ai/api/v1"
        self.default_model = os.getenv("AI_MODEL", "openai/gpt-3.5-turbo")
        self.app_name = os.getenv("APP_NAME", "SherpaGCM-DocumentMaker")
        self.app_url = os.getenv("APP_URL", "http://localhost")

    def is_available(self) -> bool:
        """Check if AI service is configured and available"""
        return bool(self.api_key)

    async def rewrite_experience(
        self,
        original_description: str,
        proposal_context: str,
        model: Optional[str] = None,
        custom_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Rewrite an experience description to align with proposal context

        Args:
            original_description: The original experience description
            proposal_context: The proposal context to align with
            model: Optional model override (defaults to configured model)
            custom_prompt: Optional custom instructions for the AI

        Returns:
            Dict with 'success', 'content', and optional 'error' keys
        """
        if not self.is_available():
            return {
                "success": False,
                "error": "AI service not configured. Please set OPENROUTER_API_KEY or OPENAI_API_KEY.",
                "content": original_description,
            }

        try:
            # Base prompt
            base_prompt = f"""You are an effective resume writer for project estimation consultant business. Rewrite the following experience description to better align with the proposal context while maintaining accuracy and professionalism.

Proposal Context: {proposal_context}

Original Experience Description: {original_description}

Rewrite the experience to:
1. Emphasize skills and achievements relevant to the proposal
2. Use action verbs and quantifiable results where possible
3. Maintain professional tone and clarity
4. Keep it concise but impactful
5. Resume is a company resume, not a personal resume."""

            # Add custom instructions if provided
            if custom_prompt:
                prompt = f"""{base_prompt}

Additional Instructions: {custom_prompt}

Rewritten Description:"""
            else:
                prompt = f"""{base_prompt}

Rewritten Description:"""

            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": self.app_url,
                "X-Title": self.app_name,
            }

            # Use OpenRouter format if using OpenRouter, otherwise OpenAI format
            if "openrouter.ai" in self.base_url:
                data = {
                    "model": model or self.default_model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a professional resume writer specializing in tailoring experiences to match project proposals.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": 500,
                    "temperature": 0.7,
                }
            else:
                # Fallback to OpenAI format
                data = {
                    "model": "gpt-3.5-turbo",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a professional resume writer specializing in tailoring experiences to match project proposals.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": 500,
                    "temperature": 0.7,
                }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions", headers=headers, json=data
                )

                if response.status_code != 200:
                    error_detail = response.text
                    return {
                        "success": False,
                        "error": f"AI API error: {response.status_code} - {error_detail}",
                        "content": original_description,
                    }

                result = response.json()
                rewritten_content = result["choices"][0]["message"]["content"].strip()

                return {
                    "success": True,
                    "content": rewritten_content,
                    "model_used": result.get("model", model or self.default_model),
                    "usage": result.get("usage", {}),
                }

        except Exception as e:
            return {
                "success": False,
                "error": f"AI service error: {str(e)}",
                "content": original_description,
            }

    def get_available_models(self) -> Dict[str, str]:
        """Get available models for selection"""
        return {
            "openai/gpt-3.5-turbo": "GPT-3.5 Turbo (Fast, Cost-effective)",
            "openai/gpt-4": "GPT-4 (High Quality, More Expensive)",
            "openai/gpt-4-turbo": "GPT-4 Turbo (Balanced)",
            "anthropic/claude-3-sonnet": "Claude 3 Sonnet (Creative)",
            "anthropic/claude-3-haiku": "Claude 3 Haiku (Fast)",
            "google/gemini-pro": "Gemini Pro (Google)",
            "meta-llama/llama-2-70b-chat": "Llama 2 70B (Open Source)",
            "mistralai/mixtral-8x7b-instruct": "Mixtral 8x7B (Open Source)",
        }


# Create a singleton instance
ai_service = AIService()
