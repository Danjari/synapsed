import os
import shutil
from langchain_community.document_loaders import PDFPlumberLoader
from .Embedding import Embedding

class PdfDocument:
    def __init__(self):
        self.chunks = []
        self.DB_DIR = "data/database"
        self.PDF_DIR = "data/document"
        self.PDF_DIRECTORY = os.path.join(os.path.dirname(__file__), 'data', 'document')
        
        os.makedirs(self.PDF_DIR, exist_ok=True)
        os.makedirs(self.PDF_DIRECTORY, exist_ok=True)

    def loadPdf(self, documentPath):
        self.path = documentPath
        
        try:
            shutil.copy(self.path, self.PDF_DIR)
        except Exception as e:
            print(f"Error copying PDF: {str(e)}")
            return []
       
        loader = PDFPlumberLoader(self.path)
        document = loader.load()
        embedding = Embedding()
        self.chunks = embedding.text_splitter.split_documents(document)
        self.addSourceMetaData()  
        return self.chunks

    def addSourceMetaData(self):
        for chunk in self.chunks:
            chunk.metadata["source"] = self.path