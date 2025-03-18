# from langchain_community.llms import Ollama
# from langchain_community.vectorstores import Chroma
# from langchain.text_splitter import RecursiveCharacterTextSplitter
# from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
# from langchain_community.document_loaders import PDFPlumberLoader
# from langchain.chains.combine_documents import create_stuff_documents_chain
# from langchain.chains import create_retrieval_chain
# from langchain_core.messages import HumanMessage, AIMessage
# from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
# from langchain.chains.history_aware_retriever import create_history_aware_retriever
# from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
# from langchain_core.callbacks import CallbackManager
# import os
# import shutil

# class Model:
#     instance = None
#     def __new__(cls):
#         if cls.instance is None:
#             cls.instance = super(Model, cls).__new__(cls)
#             cls.instance.llm = Ollama(model="llama3.1")
#         return cls.instance

# class Embedding:
#     instance = None
    
#     def __new__(cls, chunk_size=2048, chunk_overlap=100, length_function=len):
#         if cls.instance is None:
#             cls.instance = super(Embedding, cls).__new__(cls)
#             cls.instance.embeddings = FastEmbedEmbeddings()
#             cls.instance.text_splitter = RecursiveCharacterTextSplitter(
#                 chunk_size=chunk_size,
#                 chunk_overlap=chunk_overlap,
#                 length_function=length_function
#             )
#             cls.instance.vectorStore = None
#         return cls.instance
    
#     def retriever(self):  
#         if self.vectorStore is None:
#             return None
        
#         return self.vectorStore.as_retriever(
#                 search_type="similarity_score_threshold",
#                 search_kwargs={
#                     "k": 5,
#                     "score_threshold": 0.1,
#                 },
#             )

# class PdfDocument: 
#     def __init__(self):
#         self.chunks = []
#         self.DB_DIR = "data/database"
#         self.PDF_DIR = "data/document"
#         self.PDF_DIRECTORY = os.path.join(os.path.dirname(__file__), 'data', 'document')
        
#         os.makedirs(self.PDF_DIR, exist_ok=True)
#         os.makedirs(self.PDF_DIRECTORY, exist_ok=True)

#     def loadPdf(self, documentPath):
#         self.path = documentPath
        
#         try:
#             shutil.copy(self.path, self.PDF_DIR)
#         except Exception as e:
#             print(f"Error copying PDF: {str(e)}")
#             return []
       
#         loader = PDFPlumberLoader(self.path)
#         document = loader.load()
#         embedding = Embedding()
#         self.chunks = embedding.text_splitter.split_documents(document)
#         self.addSourceMetaData()  
#         return self.chunks

#     def addSourceMetaData(self):
#         for chunk in self.chunks:
#             chunk.metadata["source"] = self.path


# class PdfCollection(Embedding, PdfDocument): 
#     def __init__(self):
#         PdfDocument.__init__(self)  
#         self.documents = []
#         self.vectorStore = None
#         os.makedirs(self.DB_DIR, exist_ok=True)

#     def addDocument(self, document):
#         self.documents.append(document)
#         self.chunks.extend(document.chunks)
    
#     def storeChunks(self):
#         if not self.chunks:
#             print("No chunks to store")
#             return
            
#         self.vectorStore = Chroma(persist_directory=self.DB_DIR, embedding_function=self.embeddings)
#         self.vectorStore.add_documents(self.chunks)
     
#     def initialize_vector_store(self):
#         try:
#             self.vectorStore = Chroma(persist_directory=self.DB_DIR, embedding_function=self.embeddings)
#             return True
#         except Exception as e:
#             print(f"Error initializing vector store: {str(e)}")
#             return False

#     def getDocuments(self):
#         return self.documents

#     def retriever(self):  
#         if self.vectorStore is None:
#             success = self.initialize_vector_store()
#             if not success:
#                 return None
#         return super().retriever()  
    

# class ChatInterface(PdfCollection, Model): 
#     def __init__(self):
#         PdfCollection.__init__(self) 
#         self.initialize_vector_store()
#         self.chat_history = []
#         self.retriever_prompt = ChatPromptTemplate.from_messages([
#             MessagesPlaceholder(variable_name="chat_history"),
#             ("human", "{input}"),
#             ("human", "Given the above conversation, generate a search query to get information relevant to the conversation"),
#         ])
#         self.CHAT_PROMPT = ChatPromptTemplate.from_messages([ 
#                 ("system", "You are a helpful assistant that answers questions based on the provided documents."),
#                 MessagesPlaceholder(variable_name="chat_history"),
#                 ("human", "{input}"),
#                 ("system", "Answer the question based only on the following context: {context}")
#             ])
        
#         self.contextAwareRetriever() 
       
    
#     def checkDocument(self):
#         if not self.vectorStore:
#             return False
            
#         try:
#             docs = self.vectorStore.get()
#             return True if docs and docs.get("metadatas") else False
#         except Exception as e:
#             print(f"Error checking documents: {str(e)}")
#             return False
    
#     def contextAwareRetriever(self):  
#         retriever = self.retriever() 
#         if not retriever:
#             print("Warning: retriever not initialized")
#             return None
            
#         self.history_aware_retriever = create_history_aware_retriever(
#             llm=self.llm,
#             retriever=retriever,
#             prompt=self.retriever_prompt
#         )   
#         return self.history_aware_retriever
    
#     def createLangChain(self):
#         if not self.history_aware_retriever:
#             print("History-aware retriever not initialized")
#             return None
            
#         doc_chain = create_stuff_documents_chain(llm=self.llm, prompt=self.CHAT_PROMPT) 
#         retrieve_chain = create_retrieval_chain(self.history_aware_retriever, doc_chain)  
#         return retrieve_chain

#     def chat(self, query):
#         # Check if documents are loaded
#         if not self.checkDocument():
#             return "No documents have been loaded. Please add documents first."
        
#         # Initialize the retriever if needed
#         if not hasattr(self, 'history_aware_retriever') or self.history_aware_retriever is None:
#             self.contextAwareRetriever()
#             if self.history_aware_retriever is None:
#                 return "Failed to initialize retriever. Please check your document store."
        
#         r_chain = self.createLangChain()
#         if not r_chain:
#             return "Failed to create language chain. Please check your configuration."

#         try:
#             res = r_chain.invoke({
#                 "input": query,
#                 "chat_history": self.chat_history
#             })

#             self.chat_history.append(HumanMessage(content=query))
#             self.chat_history.append(AIMessage(content=res["answer"]))
#             return res["answer"]
#         except Exception as e:
#             error_message = f"Error processing query: {str(e)}"
#             print(error_message)
#             return error_message

from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain.chains.history_aware_retriever import create_history_aware_retriever

from utils.PdfCollection import PdfCollection
from utils.Model import Model

class ChatInterface(PdfCollection, Model): 
    def __init__(self):
        PdfCollection.__init__(self) 
        self.initialize_vector_store()
        self.chat_history = []
        self.retriever_prompt = ChatPromptTemplate.from_messages([
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            ("human", "Given the above conversation, generate a search query to get information relevant to the conversation"),
        ])
        self.CHAT_PROMPT = ChatPromptTemplate.from_messages([ 
                ("system", "You are a helpful assistant that answers questions based on the provided documents."),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{input}"),
                ("system", "Answer the question based only on the following context: {context}")
            ])
        
        self.contextAwareRetriever() 
       
    def checkDocument(self):
        if not self.vectorStore:
            return False
            
        try:
            docs = self.vectorStore.get()
            return True if docs and docs.get("metadatas") else False
        except Exception as e:
            print(f"Error checking documents: {str(e)}")
            return False
    
    def contextAwareRetriever(self):  
        retriever = self.retriever() 
        if not retriever:
            print("Warning: retriever not initialized")
            return None
            
        self.history_aware_retriever = create_history_aware_retriever(
            llm=self.llm,
            retriever=retriever,
            prompt=self.retriever_prompt
        )   
        return self.history_aware_retriever
    
    def createLangChain(self):
        if not self.history_aware_retriever:
            print("History-aware retriever not initialized")
            return None
            
        doc_chain = create_stuff_documents_chain(llm=self.llm, prompt=self.CHAT_PROMPT) 
        retrieve_chain = create_retrieval_chain(self.history_aware_retriever, doc_chain)  
        return retrieve_chain

    def chat(self, query):
        # Check if documents are loaded
        if not self.checkDocument():
            return "No documents have been loaded. Please add documents first."
        
        # Initialize the retriever if needed
        if not hasattr(self, 'history_aware_retriever') or self.history_aware_retriever is None:
            self.contextAwareRetriever()
            if self.history_aware_retriever is None:
                return "Failed to initialize retriever. Please check your document store."
        
        r_chain = self.createLangChain()
        if not r_chain:
            return "Failed to create language chain. Please check your configuration."

        try:
            res = r_chain.invoke({
                "input": query,
                "chat_history": self.chat_history
            })

            self.chat_history.append(HumanMessage(content=query))
            self.chat_history.append(AIMessage(content=res["answer"]))
            return res["answer"]
        except Exception as e:
            error_message = f"Error processing query: {str(e)}"
            print(error_message)
            return error_message