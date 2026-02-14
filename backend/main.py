from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import client
from routes import reports

app = FastAPI(title="Garbage Detection API")
app.include_router(reports.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to Garbage Detection API"}

@app.on_event("startup")
async def startup_db_client():
    # MongoDB connection is initiated through the client import
    pass

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
