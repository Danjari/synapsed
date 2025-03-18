from langchain_community.llms import Ollama
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain_core.callbacks import CallbackManager

class Model:
    instance = None
    
    def __new__(cls):
        if cls.instance is None:
            cls.instance = super(Model, cls).__new__(cls)
            cls.instance.llm = Ollama(model="llama3.1")
        return cls.instance