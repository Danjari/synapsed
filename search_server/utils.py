import requests
import json
from classes import Course, Results, Chapter, Roadmap
import spacy
import os
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv() #load environment variables

headers = {
        "X-Auth-API-Key": os.getenv("THINKIFIC_KEY"),
        "X-Auth-Subdomain": "maarifasasa",
        "Content-Type": "application/json",
    }


def get_all_courses() -> list:

    url = "https://api.thinkific.com/api/public/v1/courses?limit=100"

#here the collections represent the different 'schools within maarifasasa'

    

    all_courses = [] # the array of courses to return
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()
        courses = data['items']

        for course in courses: # get all courses and append them to the array
            # new_course = Course(course["id"], course["name"], course["slug"], course["description"], course["keywords"], course["course_card_image_url"], course["chapter_ids"])
            all_courses.append(course)

        # for course in all_courses:
        #     print(course.name, "keywords: ", course.keywords)
        #     print("================")
        return all_courses
    else:
        print(f"Error: {response.status_code}, {response.text}")
        return []
    
def get_chapters_by_course_id(course_id: int):
    url = f"https://api.thinkific.com/api/public/v1/courses/{course_id}/chapters?page=1&limit=25"
    all_chapters = []
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        chapters = data['items']
        for chapter in chapters:
            all_chapters.append(chapter)
            

def filter_all_courses_from_query(query: str, courses: list[Course]) -> list[Course]: # takes in a list of courses and a query and filters the relevant queries
    nlp = spacy.load('en_core_web_lg')
    query_string = nlp(query)

    relevant_courses = []
    for course in courses:
        print(f"The current course is {course.name}")
        #if the similarity between the query and the course keywords and name is higher than a certain treshold then we append it to the relevant courses
        course_string = nlp(course.name)
        
        print(f"The query string is {query_string} and the course string is {course_string}")
        print(f"The similarity between {query} and {course.name} is {query_string.similarity(course_string)} ")
        if query_string.similarity(course_string) > 0.5:
            relevant_courses.append(course)
            # relevant_courses.append(course)
            # print(f"Appended {course.name} to the relevant courses")
        #otherwise we continue

    return relevant_courses


def filter_all_courses_from_query_openai(query: str, courses: list):
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    print("Generating a list of relevant courses...")
    completion = client.beta.chat.completions.parse(
    model="gpt-4o-mini-2024-07-18",
    messages=[
        {"role": "system", "content": f"You are a helpful course instructor insterested in knowing the best courses for students based on their requests. Based on the query of a student, and the differnet courses available and their keywords, return the list of the most relevant courses for that student, it could be multiple of them. This is the query of the student: {query}, and these are the different course names: {[course['name'] for course in courses]} with their respective keywords: {[course['keywords'] for course in courses]}, course IDs: {[course['id'] for course in courses]} and chapter IDs: {[course['chapter_ids'] for course in courses]}. Make sure to give a range of courses in the order that makes the most sense to follow them"},
  
    ],
    response_format=Results,
)
    relevant_course_names = completion.choices[0].message
    print("Relevant Course Generation Complete")
    return relevant_course_names


def get_chapter_sequence(query: str, courses: list):

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    print("Generating roadmap from list of courses")
    completion = client.beta.chat.completions.parse(
    model="gpt-4o-mini-2024-07-18",
    messages=[
        {"role": "system", "content": f"You are a helpful course instructor insterested in knowing the best courses for students based on their requests. Based on the query of a student, and the differnet courses available and their keywords as well as the different chapters, return the list of the right sequence of course and chapters for that student, it could be multiple of them. This is the query of the student: {query}, and these are the different course names: {[course["course_name"] for course in courses]}, IDs: {[course["course_id"] for course in courses]} and respective chapters: {[course["chapters"]["items"] for course in courses if course.get("chapters") is not None]}. Make sure to look at ALL the chapters and generate the roadmap. If you see some chapters being duplicated or too similar, remove them"},
  
    ],
    response_format=Roadmap,
)
    path = completion.choices[0].message
    print("Roadmap generation done")
    
    return path
    

def cosine_similarity():
    pass

get_all_courses()