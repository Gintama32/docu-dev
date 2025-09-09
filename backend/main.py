import logging
import os
import traceback
from contextlib import asynccontextmanager
from datetime import datetime
from logging.handlers import RotatingFileHandler

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from . import crud, models, schemas
from .database import SessionLocal, engine, get_db
from .routers import (
    ai,
    auth,
    clients,
    experiences,
    media,
    projects,
    proposals,
    resumes,
    templates,
    user_profiles,
)
from .services.template_service import template_service

load_dotenv()


# Database tables are created via Alembic migrations


# Configuration management
class Settings:
    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.debug = self.environment == "development"
        self.allowed_hosts = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
        self.cors_origins = self._get_cors_origins()
        self.log_level = os.getenv("LOG_LEVEL", "INFO").upper()
        self.max_log_size = int(os.getenv("MAX_LOG_SIZE", "5242880"))  # 5MB
        self.log_backup_count = int(os.getenv("LOG_BACKUP_COUNT", "5"))

        # Validate required environment variables
        self._validate_environment()

    def _get_cors_origins(self):
        if self.debug:
            return [
                "http://localhost",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
            ]
        return os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else []

    def _validate_environment(self):
        """Validate critical environment variables"""
        required_vars = ["DATABASE_URL"]
        missing_vars = [var for var in required_vars if not os.getenv(var)]

        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")


settings = Settings()


# Application lifespan manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger = logging.getLogger("app")
    logger.info("Application startup - initializing...")

    # Initialize default data
    await _initialize_default_data()
    logger.info("Application startup complete")

    yield

    # Shutdown
    logger.info("Application shutdown")


# Initialize FastAPI app
app = FastAPI(
    title="SherpaGCM Document Maker API",
    description="API for generating personalized resumes and project proposals",
    version="1.0.0",
    debug=settings.debug,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

# Security middleware
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)


# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if not settings.debug:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# Configure rotating file logging to backend/logs/app.log
def _setup_logging():
    try:
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        logs_dir = os.path.join(backend_dir, "logs")
        os.makedirs(logs_dir, exist_ok=True)
        log_path = os.path.join(logs_dir, "app.log")

        file_handler = RotatingFileHandler(
            log_path,
            maxBytes=settings.max_log_size,
            backupCount=settings.log_backup_count,
        )
        file_handler.setLevel(getattr(logging, settings.log_level))
        formatter = logging.Formatter(
            fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        file_handler.setFormatter(formatter)

        for name in ("uvicorn", "uvicorn.error", "uvicorn.access", "app"):
            logger = logging.getLogger(name)
            logger.setLevel(getattr(logging, settings.log_level))
            # Avoid duplicate handlers on reload
            if not any(
                isinstance(h, RotatingFileHandler) and getattr(h, "baseFilename", None) == log_path
                for h in logger.handlers
            ):
                logger.addHandler(file_handler)
    except Exception as e:
        # As a fallback, don't crash logging setup
        logging.getLogger("app").warning(f"Logging setup failed: {e}")


_setup_logging()

# Mount static files for images with optimized settings
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount(
    "/static",
    StaticFiles(directory=static_dir, html=False, check_dir=False),
    name="static",
)

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


async def _initialize_default_data():
    """Initialize default data on startup"""
    db = SessionLocal()
    try:
        # Create a default template if it doesn't exist
        default_template = crud.get_default_template(db)
        if not default_template:
            # Load template content from file using template service
            template_content = template_service.get_default_template_content()

            crud.create_template(
                db,
                schemas.TemplateCreate(name="Default", content=template_content, is_default=True),
            )
            logging.getLogger("app").info("Created default template from template file")
    finally:
        db.close()


@app.get("/")
def read_root():
    """Root endpoint with API information"""
    return {
        "message": "SherpaGCM Document Maker API",
        "version": "1.0.0",
        "environment": settings.environment,
        "docs": "/docs" if settings.debug else None,
        "openapi": "/openapi.json" if settings.debug else None,
        "status": "running",
    }


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint with database connectivity check"""
    try:
        # Test database connection
        db.execute("SELECT 1")
        db_status = "healthy"
    except Exception as e:
        logging.getLogger("app").error(f"Database health check failed: {e}")
        db_status = "unhealthy"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "database": db_status,
        "environment": settings.environment,
        "version": "1.0.0",
        "cors_origins": settings.cors_origins,  # Temporary for debugging
        "debug_mode": settings.debug,  # Temporary for debugging
    }


@app.get("/api/templates/available")
def list_available_templates():
    """List all available template files"""
    if not settings.debug:
        # Only allow in development for security
        return {"error": "Not available in production"}

    templates = template_service.list_available_templates()
    return {"templates": templates, "count": len(templates)}


# Enhanced error handling and monitoring


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests for monitoring"""
    start_time = datetime.now()
    logger = logging.getLogger("app")

    # Log request
    logger.info(f"Request: {request.method} {request.url.path}")

    try:
        response = await call_next(request)
        duration = (datetime.now() - start_time).total_seconds()

        # Log response
        logger.info(f"Response: {response.status_code} | Duration: {duration:.3f}s")
        return response
    except Exception as e:
        duration = (datetime.now() - start_time).total_seconds()
        logger.error(
            f"Request failed: {request.method} {request.url.path} | Duration: {duration:.3f}s | Error: {str(e)}"
        )
        raise


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Enhanced validation error handler with better logging"""
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


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected errors"""
    logger = logging.getLogger("app")
    logger.error(f"Unhandled exception: {request.method} {request.url.path} | {str(exc)}")
    logger.error(f"Traceback: {traceback.format_exc()}")

    if settings.debug:
        return JSONResponse(status_code=500, content={"detail": f"Internal server error: {str(exc)}"})
    else:
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})
