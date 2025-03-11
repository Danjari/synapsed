from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from db import supabase_client
from utils import create_learning_path, get_all_courses, insert_courses_to_db, match_courses, order_chapters_for_query

app =  FastAPI()


class SearchQuery(BaseModel):
    query: str


@app.get("/")
async def root():
    return {"message": "Welcome to SynapsED"}

@app.post("/generate")
async def generate_learning_path(request: SearchQuery):

    query = request.query
    learning_path = create_learning_path(query)

    return {"learning_path": learning_path}



@app.post("/upload_courses")
async def upload_courses():
    courses = get_all_courses()
    response = insert_courses_to_db(courses)
    return response


@app.post("/upload_chapters")
async def upload_chapters():
    courses = get_all_courses()
    for course in courses:
        course_id = course["id"]
        # chapters = get_chapters_by_course_id(course_id)
        # response = insert_chapters_to_db(chapters)
    # return response