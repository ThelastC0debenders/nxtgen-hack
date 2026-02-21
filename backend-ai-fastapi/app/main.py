from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logger import logger
from app.api.routes import health

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI Intelligence layer for real-time invoice verification and fraud detection.",
    version="1.0.0",
    docs_url=f"{settings.API_V1_STR}/docs",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# 1. Setup CORS
# In production, restrict allow_origins to the specific Node.js backend domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# 2. Include Routers
app.include_router(health.router, prefix=settings.API_V1_STR)
# In future phases we will add `app.include_router(fraud.router)`
# In future phases we will add `app.include_router(similarity.router)`

# 3. Application Lifecycle Events
@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting up {settings.PROJECT_NAME}...")
    # This is where we will load our ML models into memory later in Phase 4/5 

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Gracefully shutting down.")
