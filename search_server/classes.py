from pydantic import BaseModel




# class Course:

#     def __init__(self, id, name, slug, description, keywords, course_image_url, chapters):

#         self.id = id
#         self.name = name
#         self.slug = slug
#         self.description = description
#         self.keywords = keywords # keywords could be useful 
#         self.course_image_url = course_image_url
#         self.chapters = chapters # this is an array of the chapter ids


# class Chapter:

#     def __init__(self, id, name, position, description, content_ids):
#         self.id = id
#         self.name = name
#         self.position = position
#         self.description = description
#         self.content_ids = content_ids



class Course(BaseModel):
    id: str
    name: str
    # slug: str
    # description: str
    keywords: str
    # course_card_image_url: str
    chapter_ids: list[int]


class Results(BaseModel):
    relevant_courses: list[Course]


class Chapter(BaseModel):
    parent_course_name: str
    parent_course_id: int
    chapter_id: int
    chapter_name: str
    content_ids: list[int]

        
class Roadmap(BaseModel):
    path: list[Chapter]

    
