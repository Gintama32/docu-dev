from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import logging
from logging.handlers import RotatingFileHandler

from . import crud, models, schemas
from .database import SessionLocal, engine
from .routers import proposals, experiences, clients, templates, resumes, ai, auth, user_profiles, projects, media

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="SherpaGCM Document Maker API",
    description="API for generating personalized resumes and project proposals",
    version="1.0.0"
)

# Configure CORS
origins = [
    "http://localhost",
    "http://localhost:5173",  # Default Vite port
    "http://127.0.0.1:5173",
    "http://localhost:3000",  # React dev server
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure rotating file logging to backend/logs/app.log
import os
def _setup_logging():
    try:
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        logs_dir = os.path.join(backend_dir, "logs")
        os.makedirs(logs_dir, exist_ok=True)
        log_path = os.path.join(logs_dir, "app.log")

        file_handler = RotatingFileHandler(log_path, maxBytes=5 * 1024 * 1024, backupCount=5)
        file_handler.setLevel(logging.INFO)
        formatter = logging.Formatter(
            fmt='%(asctime)s | %(levelname)s | %(name)s | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(formatter)

        for name in ("uvicorn", "uvicorn.error", "uvicorn.access", "app"):
            logger = logging.getLogger(name)
            logger.setLevel(logging.INFO)
            # Avoid duplicate handlers on reload
            if not any(isinstance(h, RotatingFileHandler) and getattr(h, 'baseFilename', None) == log_path for h in logger.handlers):
                logger.addHandler(file_handler)
    except Exception as e:
        # As a fallback, don't crash logging setup
        logging.getLogger("app").warning(f"Logging setup failed: {e}")

_setup_logging()

# Mount static files for images
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Include routers
app.include_router(auth.router)
app.include_router(proposals.router)
app.include_router(experiences.router)
app.include_router(clients.router)
app.include_router(templates.router)
app.include_router(resumes.router)
app.include_router(ai.router)
app.include_router(user_profiles.router)
app.include_router(projects.router)
app.include_router(media.router)
app.include_router(media.public_router)


@app.on_event("startup")
def on_startup():
    """Initialize default data on startup"""
    db = SessionLocal()
    try:
        # Create a default template if it doesn't exist
        default_template = crud.get_default_template(db)
        if not default_template:
            template_content = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Resume - {{ proposal.name }}</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
                    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
                    h2 { color: #34495e; margin-top: 30px; }
                    h3 { color: #7f8c8d; }
                    .experience { margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-left: 4px solid #3498db; }
                    .client-info { color: #666; font-style: italic; }
                    .project-description { margin-top: 10px; }
                    .metadata { color: #999; font-size: 0.9em; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
                </style>
            </head>
            <body>
                <h1>{{ proposal.name }}</h1>
                {% if proposal.client %}
                <p class="client-info">Client: {{ proposal.client.client_name }}</p>
                {% endif %}
                {% if proposal.context %}
                <p><strong>Context:</strong> {{ proposal.context }}</p>
                {% endif %}
                
                <h2>Relevant Experience</h2>
                {% for exp in experiences %}
                <div class="experience">
                    <h3>{{ exp.project_name }}</h3>
                    {% if exp.client %}
                    <p class="client-info">Client: {{ exp.client.client_name }}</p>
                    {% endif %}
                    <div class="project-description">
                        <p><strong>Description:</strong> {{ exp.project_description }}</p>
                        {% if exp.location %}
                        <p><strong>Location:</strong> {{ exp.location }}</p>
                        {% endif %}
                        {% if exp.date_started or exp.date_completed %}
                        <p><strong>Duration:</strong> {{ exp.date_started or 'N/A' }} - {{ exp.date_completed or 'N/A' }}</p>
                        {% endif %}
                    </div>
                </div>
                {% endfor %}
                
                <div class="metadata">
                    <p>Generated by SherpaGCM Document Maker</p>
                    <p>Resume ID: {{ resume.id }}</p>
                </div>
            </body>
            </html>
            """
            crud.create_template(db, schemas.TemplateCreate(name="Default", content=template_content, is_default=True))
    finally:
        db.close()


@app.get("/")
def read_root():
    """Root endpoint with API information"""
    return {
        "message": "SherpaGCM Document Maker API",
        "version": "1.0.0",
        "docs": "/docs",
        "openapi": "/openapi.json"
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


# Optional: log validation errors with payload for easier debugging
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    try:
        body_bytes = await request.body()
        try:
            body_preview = body_bytes.decode("utf-8")[:2000]
        except Exception:
            body_preview = str(body_bytes)[:2000]
        logging.getLogger("app").warning(
            "Validation error on %s %s | body=%s | errors=%s",
            request.method,
            request.url.path,
            body_preview,
            exc.errors(),
        )
    except Exception:
        logging.getLogger("app").warning(
            "Validation error on %s %s (failed to capture body) | errors=%s",
            request.method,
            request.url.path,
            exc.errors(),
        )

    safe_errors = jsonable_encoder(exc.errors())
    return JSONResponse(status_code=422, content={"detail": safe_errors})
