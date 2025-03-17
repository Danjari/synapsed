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
import time
import random

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
        print(f"Successfully processed {file_name} with Mistral OCR")
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
        print(f"Reading the file {file.filename}")
        document_id = str(uuid.uuid4())
        temp_file_path = None
        
        try:
            # Create a temporary file more efficiently
            suffix = os.path.splitext(file.filename)[1].lower()
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                content = await file.read()
                temp_file.write(content)
                temp_file_path = temp_file.name
            
            # Process the document based on its type
            if suffix == '.pdf':
                print("This is a PDF, processing with Mistral OCR")
                documents = await process_pdf_with_mistral_ocr(temp_file_path, file.filename)
            elif suffix == '.docx':
                loader = Docx2txtLoader(temp_file_path)
                documents = loader.load()
            elif suffix == '.txt':
                loader = TextLoader(temp_file_path)
                documents = loader.load()
            else:
                raise HTTPException(status_code=400, detail="Unsupported file format")
                
            # Split the document text into chunks - use larger chunks to reduce total number
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=800,  # Increased chunk size to reduce number of API calls
                chunk_overlap=100
            )
            chunks = text_splitter.split_documents(documents)
            if not chunks:
                raise HTTPException(status_code=400, detail="Unable to extract text from document")

            print(f"Document split into {len(chunks)} chunks")
            
            # Process in optimized batches
            batch_size = 20  # Larger batch size to reduce number of API calls while staying under limits
            all_vectors = []
            max_retries = 5
            base_delay = 1
            
            # Pre-extract all text content to avoid repeated operations
            all_chunk_texts = [chunk.page_content for chunk in chunks]
            total_batches = (len(chunks) + batch_size - 1) // batch_size
            
            # Process embeddings in batches
            for i in range(0, len(chunks), batch_size):
                batch_chunks = chunks[i:i+batch_size]
                batch_texts = all_chunk_texts[i:i+batch_size]
                current_batch = i // batch_size + 1
                
                print(f"Processing embedding batch {current_batch} of {total_batches}")
                
                # Retry logic for rate limits
                for retry in range(max_retries):
                    try:
                        # Generate embeddings
                        embeddings = pinecone.inference.embed(
                            model="llama-text-embed-v2",
                            inputs=batch_texts,
                            parameters={"input_type": "passage", "truncate": "END"}
                        )
                        
                        if not embeddings:
                            print(f"Warning: No embeddings returned for batch {current_batch}")
                            break
                        
                        # Create vectors more efficiently
                        batch_vectors = [
                            {
                                "id": f"{document_id}-{i+j}",
                                "values": emb['values'],
                                "metadata": {
                                    'text': chunk.page_content[:500],
                                    'source': os.path.basename(chunk.metadata.get('source', file.filename)),
                                    'document_id': document_id
                                }
                            }
                            for j, (chunk, emb) in enumerate(zip(batch_chunks, embeddings))
                        ]
                        
                        all_vectors.extend(batch_vectors)
                        print(f"Created {len(batch_vectors)} vectors for batch {current_batch}")
                        
                        # Adaptive rate limiting - sleep longer for larger batches
                        sleep_time = 1.5 * (len(batch_texts) / 10)  # Scale sleep time based on batch size
                        time.sleep(sleep_time)
                        break
                        
                    except Exception as e:
                        if "429" in str(e) or "rate limit" in str(e).lower() or "RESOURCE_EXHAUSTED" in str(e):
                            if retry < max_retries - 1:
                                # Exponential backoff with jitter
                                delay = base_delay * (2 ** retry) + random.uniform(0, 1)
                                print(f"Rate limit exceeded. Retrying batch {current_batch} in {delay:.2f} seconds...")
                                time.sleep(delay)
                            else:
                                print(f"Failed to process batch {current_batch} after {max_retries} retries: {str(e)}")
                        else:
                            print(f"Error processing embedding batch {current_batch}: {str(e)}")
                            break
            
            if not all_vectors:
                raise HTTPException(status_code=400, detail="Failed to generate any valid vectors")
            
            print(f"Created total of {len(all_vectors)} vectors for upsert")
            
            # Optimize upsert with larger batches
            upsert_batch_size = 20  # Increased from 10 to reduce API calls
            successful_upserts = 0
            total_upsert_batches = (len(all_vectors) + upsert_batch_size - 1) // upsert_batch_size
            
            for i in range(0, len(all_vectors), upsert_batch_size):
                batch = all_vectors[i:i+upsert_batch_size]
                current_upsert_batch = i // upsert_batch_size + 1
                
                for retry in range(max_retries):
                    try:
                        print(f"Upserting batch {current_upsert_batch}/{total_upsert_batches} with {len(batch)} vectors")
                        index.upsert(vectors=batch, namespace="test")
                        successful_upserts += len(batch)
                        print(f"Successfully upserted batch {current_upsert_batch}")
                        
                        # Shorter delay between upsert batches
                        time.sleep(0.3)
                        break
                        
                    except Exception as e:
                        if "429" in str(e) or "rate limit" in str(e).lower() or "RESOURCE_EXHAUSTED" in str(e):
                            if retry < max_retries - 1:
                                delay = base_delay * (2 ** retry) + random.uniform(0, 1)
                                print(f"Rate limit exceeded. Retrying upsert batch {current_upsert_batch} in {delay:.2f} seconds...")
                                time.sleep(delay)
                            else:
                                print(f"Failed to upsert batch {current_upsert_batch} after {max_retries} retries")
                        else:
                            print(f"Error in Pinecone batch upsert {current_upsert_batch}: {str(e)}")
                            break
            
            if successful_upserts == 0:
                raise HTTPException(status_code=500, detail="Failed to upsert any vectors to Pinecone")
            
            print(f"Successfully upserted {successful_upserts} out of {len(all_vectors)} vectors")
            
            # Only verify the first vector instead of fetching stats
            if all_vectors:
                try:
                    fetch_response = index.fetch(ids=[all_vectors[0]["id"]], namespace="test")
                    print(f"Verification: First vector exists in index: {bool(fetch_response)}")
                except Exception as e:
                    print(f"Warning: Could not verify vectors in index: {str(e)}")
            
            return DocumentResponse(
                message=f"Document '{file.filename}' processed successfully with {'Mistral OCR' if suffix == '.pdf' else 'standard processing'}",
                document_id=document_id,
                status="success"
            )
            
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error processing document: {str(e)}")
        
        finally:
            # Clean up temporary file
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                except:
                    pass
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with a document using RAG.
    """
    try:
        history = []
        for h in request.history:
            if "human" in h and "ai" in h:
                history.append((h["human"], h["ai"]))

        # Generate embedding for the query
        embedding = pinecone.inference.embed(
            model="llama-text-embed-v2",
            inputs=[request.query],
            parameters={
                "input_type": "query"
            }
        )

        # Query Pinecone for similar documents
        results = index.query(
            namespace="test",
            vector=embedding[0].values,
            top_k=3,
            include_values=False,
            include_metadata=True
        )
        # Format the results for the response
        source_documents = []
        for match in results.get('matches', []):
            source_documents.append({
                'content': match.get('metadata', {}).get('text', 'No content available'),
                'source': match.get('metadata', {}).get('source', 'Unknown source'),
                'score': match.get('score', 0)
            })
        
        # Generate a response message
        if source_documents:
            response_text = f"I found {len(source_documents)} relevant documents. Here's the most relevant information: {source_documents[0]['content'][:200]}..."
        else:
            response_text = "I couldn't find any relevant information for your query."
        
        # Return a properly formatted ChatResponse
        return ChatResponse(
            response=response_text,
            source_documents=source_documents
        )
    
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
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