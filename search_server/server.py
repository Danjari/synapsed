from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from db import supabase_client

app =  FastAPI()


class SearchQuery(BaseModel):
    query: str

@app.get("/")
def hello():
    return {"Result": "Hi There!"}




