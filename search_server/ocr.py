# main.py
from pinecone import Pinecone, ServerlessSpec
import os
import uuid
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from langchain_community.embeddings import OpenAIEmbeddings
from langchain_community.llms import OpenAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.document_loaders import TextLoader, PyPDFLoader, Docx2txtLoader
from langchain.chains import ConversationalRetrievalChain
from langchain.chat_models import ChatOpenAI
from langchain.schema import Document
import tempfile
from dotenv import load_dotenv
# Import Mistral SDK for OCR
from mistralai import Mistral
from mistralai import DocumentURLChunk, ImageURLChunk, TextChunk
from mistralai.models import OCRResponse

app = FastAPI(title="Document RAG API")

load_dotenv()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Specify your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables (in production, use a proper .env file or environment variables)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "document-rag")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "iwFigTtzXjeTf5lJu3lBbiLjxGRsmybx")

# Initialize Pinecone
pinecone = Pinecone(api_key=PINECONE_API_KEY)

# Initialize Mistral client for OCR
mistral_client = Mistral(api_key=MISTRAL_API_KEY)

# Initialize embeddings


# Check if index exists, if not create it
if not pinecone.has_index(PINECONE_INDEX_NAME):
    pinecone.create_index(
        name=PINECONE_INDEX_NAME,
        dimension=1024,
        metric="cosine",
        spec=ServerlessSpec(
            cloud="aws",
            region='us-east-1'
    )
)
    
index = pinecone.Index(PINECONE_INDEX_NAME)


# Pydantic models
class ChatRequest(BaseModel):
    query: str
    session_id: str
    history: Optional[List[Dict[str, str]]] = []

class ChatResponse(BaseModel):
    response: str
    source_documents: Optional[List[Dict[str, Any]]] = None

class DocumentResponse(BaseModel):
    message: str
    document_id: str
    status: str

def replace_images_in_markdown(markdown_str: str, images_dict: dict) -> str:
    """Replace image placeholders in markdown with base64 encoded images."""
    for img_name, base64_str in images_dict.items():
        markdown_str = markdown_str.replace(f"![{img_name}]({img_name})", f"![{img_name}]({base64_str})")
    return markdown_str

def get_combined_markdown(ocr_response: OCRResponse) -> str:
    """Combine all pages from OCR response into a single markdown string."""
    markdowns: list[str] = []
    for page in ocr_response.pages:
        image_data = {}
        for img in page.images:
            image_data[img.id] = img.image_base64
        markdowns.append(replace_images_in_markdown(page.markdown, image_data))
    return "\n\n".join(markdowns)

async def process_pdf_with_mistral_ocr(file_path: str, file_name: str) -> List[Document]:
    """Process a PDF file using Mistral's OCR technology and return LangChain documents."""
    try:
        # Create a Path object for the file
        pdf_file = Path(file_path)
        
        # Upload the file to Mistral
        uploaded_file = mistral_client.files.upload(
            file={
                "file_name": Path(file_name).stem,
                "content": pdf_file.read_bytes(),
            },
            purpose="ocr",
        )
        
        # Get a signed URL for the uploaded file
        signed_url = mistral_client.files.get_signed_url(file_id=uploaded_file.id, expiry=1)
        
        # Process the document with OCR
        ocr_response = mistral_client.ocr.process(
            document=DocumentURLChunk(document_url=signed_url.url), 
            model="mistral-ocr-latest", 
            include_image_base64=True
        )
        
        # Get the combined markdown text
        markdown_text = get_combined_markdown(ocr_response)
        
        # Convert to LangChain Document format
        documents = [
            Document(
                page_content=markdown_text,
                metadata={
                    "source": file_name,
                    "ocr_processed": True
                }
            )
        ]
        
        return documents
    
    except Exception as e:
        print(f"Error in Mistral OCR processing: {str(e)}")
        raise e
    
@app.get("/")
def hello():
    return 'hello'

@app.post("/upload-document", response_model=DocumentResponse)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload, process, and vectorize a document to Pinecone.
    Uses Mistral's OCR for PDF files to extract text more accurately.
    """
    try:
        
        # Generate a unique ID for this document
        document_id = str(uuid.uuid4())
        
        # Create a temporary file
        suffix = os.path.splitext(file.filename)[1].lower()
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            # Write the uploaded file content
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        # Process the document based on its type
        if suffix == '.pdf':
            # Use Mistral OCR for PDF files
            documents = await process_pdf_with_mistral_ocr(temp_file_path, file.filename)
        elif suffix == '.docx':
            loader = Docx2txtLoader(temp_file_path)
            documents = loader.load()
        elif suffix == '.txt':
            loader = TextLoader(temp_file_path)
            documents = loader.load()
        else:
            os.unlink(temp_file_path)
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        # Split the document text into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        chunks = text_splitter.split_documents(documents) #split the document into chunks

        embeddings = pinecone.inference.embed(
        model="llama-text-embed-v2",
        inputs=[chunk for chunk in chunks],
        parameters={"input_type": "passage", "truncate": "END"}
    )
        
        vectors = []
        i = 0
        for d, e in zip(documents, embeddings):
            vectors.append({
                "id": len(documents) + i,
                "values": e['values'],
                "metadata": {'text': 'text'}
            })

        index.upsert(
        vectors=vectors,
        namespace="example-namespace"
        )
        
        os.unlink(temp_file_path)
        
        return DocumentResponse(
            message=f"Document '{file.filename}' processed successfully with {'Mistral OCR' if suffix == '.pdf' else 'standard processing'}",
            document_id=document_id,
            status="success"
        )
    
    except Exception as e:
        # Try to clean up the temporary file if it exists
        try:
            if 'temp_file_path' in locals():
                os.unlink(temp_file_path)
        except:
            pass
            
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with a document using RAG.
    """
    try:
        # Initialize LLM
        llm = ChatOpenAI(temperature=0.7, model_name="gpt-3.5-turbo", openai_api_key=OPENAI_API_KEY)
        
        # Create retriever
        # retriever = vectorstore.as_retriever(
        #     search_type="similarity",
        #     search_kwargs={"k": 5}
        # )
        
        # Create conversation chain
        # chain = ConversationalRetrievalChain.from_llm(
        #     llm=llm,
        #     retriever=retriever,
        #     return_source_documents=True
        # )
        
        # Convert chat history to the format expected by the chain
        history = []
        for h in request.history:
            if "human" in h and "ai" in h:
                history.append((h["human"], h["ai"]))
        
        # Get response
        # result = chain({"question": request.query, "chat_history": history})
        
        # Format source documents for the response
        # sources = []
        # for doc in result["source_documents"]:
        #     sources.append({
        #         "content": doc.page_content,
        #         "metadata": doc.metadata
        #     })
        
        # return ChatResponse(
        #     response=result["answer"],
        #     source_documents=sources
        # )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")

@app.get("/health")
async def health_check():
    """
    Check if the API is running.
    """
    return {"status": "healthy"}

# Run with: uvicorn main:app --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)