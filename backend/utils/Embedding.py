from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter

class Embedding:
    instance = None
    
    def __new__(cls, chunk_size=2048, chunk_overlap=100, length_function=len):
        if cls.instance is None:
            cls.instance = super(Embedding, cls).__new__(cls)
            cls.instance.embeddings = FastEmbedEmbeddings()
            cls.instance.text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                length_function=length_function
            )
            cls.instance.vectorStore = None
        return cls.instance
    
    def retriever(self):  
        if self.vectorStore is None:
            return None
        
        return self.vectorStore.as_retriever(
                search_type="similarity_score_threshold",
                search_kwargs={
                    "k": 5,
                    "score_threshold": 0.1,
                },
            )