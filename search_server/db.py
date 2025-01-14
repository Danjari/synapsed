import os
from supabase import create_client, Client



def supabase_client():
    try:
        url: str = os.environ.get("SUPABASE_URL")
        key: str = os.environ.get("SUPABASE_KEY")
        supabase: Client = create_client(url, key)
        if supabase:
            print("The client was successfully initialized")
            return supabase

    except: 
        print("Failed to initialize client")

