# utils/db_mongo.py
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()  # loads .env file

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)

db = client["vbb_db"]  # or whatever DB name you want

def log_trip(data, collection):
    db[collection].insert_one(data)
