# Backend Reorganization

## New Structure

The backend has been reorganized for better maintainability and scalability:

```
backend/
├── main.py                 # Main FastAPI app (simplified)
├── routers/                # API route modules
│   ├── proposals.py        # Proposal endpoints
│   ├── experiences.py      # Experience endpoints
│   ├── clients.py          # Client endpoints
│   ├── templates.py        # Template endpoints
│   ├── resumes.py          # Resume & AI endpoints
│   └── ai.py              # AI status & models
├── services/               # Business logic services
│   └── ai_service.py       # AI service with OpenRouter
├── models.py              # Database models
├── schemas.py             # Pydantic schemas
├── crud.py                # Database operations
├── database.py            # Database configuration
└── requirements.txt       # Dependencies
```

## Key Improvements

### 1. Modular Router Structure
- **proposals.py**: All proposal-related endpoints
- **resumes.py**: Resume CRUD + AI generation endpoints  
- **ai.py**: AI service status and model selection

### 2. OpenRouter Integration
- Flexible model selection (GPT-4, Claude, Gemini, Llama, etc.)
- Easy switching between providers
- Cost optimization through model choice

### 3. Clean Separation of Concerns
- **Routers**: Handle HTTP requests/responses
- **Services**: Business logic (AI operations)
- **CRUD**: Database operations
- **Main**: App initialization and configuration

## Configuration

### Environment Variables

```bash
# AI Configuration (Choose one)
OPENROUTER_API_KEY=your_openrouter_key  # Recommended
OPENAI_API_KEY=your_openai_key          # Fallback

# Model Selection
AI_MODEL=openai/gpt-3.5-turbo           # Default model

# App Info
APP_NAME=SherpaGCM-DocumentMaker
APP_URL=http://localhost:3000
```

### Available Models

Via OpenRouter, you can easily switch between:
- **OpenAI**: GPT-3.5 Turbo, GPT-4, GPT-4 Turbo
- **Anthropic**: Claude 3 Sonnet, Claude 3 Haiku  
- **Google**: Gemini Pro
- **Meta**: Llama 2 70B
- **Mistral**: Mixtral 8x7B
- And many more...

## Benefits

1. **Maintainability**: Smaller, focused files
2. **Scalability**: Easy to add new endpoints/features
3. **Flexibility**: Multiple AI providers through OpenRouter
4. **Testing**: Easier to test individual modules
5. **Documentation**: Auto-generated API docs with proper grouping

## Migration

The API endpoints remain the same, so no frontend changes are needed. The reorganization is purely internal for better code organization.

## New Endpoints

- `GET /api/ai/models` - Get available AI models
- `GET /api/ai/status` - Get AI service status
- `GET /health` - Health check endpoint
