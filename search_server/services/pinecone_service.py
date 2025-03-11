from pinecone import Pinecone
from pinecone_plugins.assistant.models.chat import Message
import os
from dotenv import load_dotenv

load_dotenv()

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"),) #init pinecone client



syllabus_assistant = pc.assistant.create_assistant(
    assistant_name='syllabus-assistant',
    instructions='Take in a syllabus and return accurate and structured information about it',
    region='us',
    timeout=30
)

response = syllabus_assistant.upload_file(
    file_path='../CS-UH-3010 Operating Systems - Section 2 - V2.pdf',
    timeout=None
)


msg = Message(role="user", content="When are the dates for the midterm and the exam")
resp = syllabus_assistant.chat(messages=[msg])

print(resp)


