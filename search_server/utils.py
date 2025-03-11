import requests
import json
from classes import Course, Results, Chapter, Roadmap
import spacy
import os
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
# from rake_nltk import Rake
from db import supabase_client
from supabase import create_client
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

load_dotenv() #load environment variables

headers = {
        "X-Auth-API-Key": os.getenv("THINKIFIC_KEY"),
        "X-Auth-Subdomain": "maarifasasa",
        "Content-Type": "application/json",
    }


def get_all_courses() -> list:

    url = "https://api.thinkific.com/api/public/v1/courses?limit=100"
    course_table_keys = ["id", "name", "slug", "description", "keywords", "chapter_ids"]
#here the collections represent the different 'schools within maarifasasa'

    
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()
        courses = data['items']
        filtered_courses = [{key: d[key] for key in course_table_keys if key in d} for d in courses]

        return filtered_courses
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
        return chapters

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
    

# def cosine_similarity():
#     pass


# def get_keywords_from_query(query: str):
#     rake = Rake()
#     rake.extract_keywords_from_text(query)
#     print(rake.get_ranked_phrases_with_scores())


def insert_courses_to_db(courses: list):

    try:
        supabase = supabase_client()
        
        response = supabase.table("courses").insert(courses).execute()
        return response
    except Exception as exception:
        print(exception) 


def insert_chapters_to_db(courses: list):

    for course in courses:
        course_id = course["id"]
        chapters = get_chapters_by_course_id(course_id)

def match_courses(query: str, courses: list):
    course_texts = [f"{course["name"]}: {course["description"]}" for course in courses] #each item represents a course and its desciption
    query_vector = [query]

    vectorizer = TfidfVectorizer().fit(course_texts + query_vector)

    course_vectors = vectorizer.transform(course_texts)
    query_vector = vectorizer.transform(query_vector)

    similarities = cosine_similarity(query_vector, course_vectors)[0]
    matched_courses = sorted(zip(courses, similarities), key=lambda x: x[1], reverse=True)
    return [course for course, score in matched_courses if score > 0.1]
    # return matched_courses



def order_chapters_for_query(query: str, relevant_courses: list):

    chapter_details = []

    for course in relevant_courses:
        course_id = course["id"]
        chapters = get_chapters_by_course_id(course_id) # get all the chapters from the course

        chapter_scores = []

        for chapter in chapters:
            chapter["course_id"] = course_id
            chapter_text = f"{chapter['name']}: {chapter['description']}"
            score = get_chapter_similarity_score(query, chapter_text)
            chapter_scores.append((chapter, score))

        sorted_chapters = sorted(chapter_scores, key=lambda x: (x[0]['position'], -x[1]))
        chapter_details.extend([chapter for chapter, _ in sorted_chapters])

    return chapter_details

def get_chapter_similarity_score(query: str, chapter_text: str):
     # Combine query and chapter text for vectorization
    texts = [query, chapter_text]
    
    # Vectorize the texts using TF-IDF
    vectorizer = TfidfVectorizer()
    vectors = vectorizer.fit_transform(texts)
    
    # Calculate cosine similarity between the query vector and chapter text vector
    score = cosine_similarity(vectors[0], vectors[1])
    
    return score[0][0]


def create_nodes(chapter_sequence: list):
    nodes = []
    for chapter in chapter_sequence:
        node = {}
        node["id"] = chapter["id"]
        node['data'] = {"label": chapter["name"], "type": "chapter", "icon": "", "description": chapter["description"], "resources": []}
        content_url = f"https://api.thinkific.com/api/public/v1/chapters/{chapter['id']}/contents?limit=100"
        response = requests.get(content_url, headers=headers)

        if response.status_code == 200:
            data = response.json()
            contents = data['items']
            for content in contents:
                resource = {"title": content["name"], "url": content["take_url"]}
                node["data"]["resources"].append(resource)

        nodes.append(node)


    return nodes

    
def create_learning_path(query: str):
    matched_courses = match_courses(query, get_all_courses())
    chapter_order = order_chapters_for_query(query, matched_courses)

    learning_path = [{"course": chapter["course_id"], "chapter": chapter["name"]} for chapter in chapter_order]
    return learning_path




