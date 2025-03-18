import os
from langchain_community.vectorstores import Chroma
from .Embedding import Embedding
from .PdfDocument import PdfDocument

class PdfCollection(Embedding, PdfDocument): 
    def __init__(self):
        PdfDocument.__init__(self)  
        self.documents = []
        self.vectorStore = None
        os.makedirs(self.DB_DIR, exist_ok=True)

    def addDocument(self, document):
        self.documents.append(document)
        self.chunks.extend(document.chunks)
    
    def storeChunks(self):
        if not self.chunks:
            print("No chunks to store")
            return
            
        self.vectorStore = Chroma(persist_directory=self.DB_DIR, embedding_function=self.embeddings)
        self.vectorStore.add_documents(self.chunks)
     
    def initialize_vector_store(self):
        try:
            self.vectorStore = Chroma(persist_directory=self.DB_DIR, embedding_function=self.embeddings)
            return True
        except Exception as e:
            print(f"Error initializing vector store: {str(e)}")
            return False

    def getDocuments(self):
        return self.documents

    def retriever(self):  
        if self.vectorStore is None:
            success = self.initialize_vector_store()
            if not success:
                return None
        return super().retriever()