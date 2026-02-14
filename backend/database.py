import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_NAME = "garbage_detection"

client = AsyncIOMotorClient(MONGO_URI)
db = client[DATABASE_NAME]

async def get_database():
    return db
