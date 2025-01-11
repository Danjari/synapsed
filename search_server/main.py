import requests
import json
from utils import get_all_courses, filter_all_courses_from_query, filter_all_courses_from_query_openai, get_chapters_by_course_id, get_chapter_sequence


def search() -> str:  

    query = input("Please enter your query: ")

    all_courses = get_all_courses()

    if len(all_courses) < 1: 
        print("No courses were found.")
        exit()

    # for course in all_courses:
    #     print(course)

    relevant_courses = filter_all_courses_from_query_openai(query, all_courses) # get all the relevant courses from the query

    if relevant_courses.parsed:
      for course in relevant_courses.parsed.relevant_courses:
          print(course.name)
    elif relevant_courses.refusal:
        # handle refusal
        print(relevant_courses.refusal)

    all_relevant_chapters = []
    for course in relevant_courses.parsed.relevant_courses:
        course_chapters = get_chapters_by_course_id(course.id)
        course_with_chapters = {"course_name": course.name, "course_id": course.id, "chapters": course_chapters}
        all_relevant_chapters.append(course_with_chapters)

    
    path = get_chapter_sequence(query, all_relevant_chapters)

    if path.parsed:
        for chapter in path.parsed.path:
            print(chapter)

    





search()
        




