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