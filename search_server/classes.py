from pydantic import BaseModel

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

    
