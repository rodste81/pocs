from supabase import create_client, Client
import streamlit as st
import os
from datetime import datetime

# Initialize Supabase client
# We will use st.secrets for production/streamlit cloud, but also check env vars for local dev
def get_supabase_client():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    
    if not url or not key:
        try:
            url = st.secrets["SUPABASE_URL"]
            key = st.secrets["SUPABASE_KEY"]
        except FileNotFoundError:
            return None
            
    return create_client(url, key)

def save_merged_file(user_id, filename, content):
    supabase = get_supabase_client()
    if not supabase:
        return None, "Supabase not configured"

    try:
        data = {
            "user_id": user_id,
            "filename": filename,
            "content": content
        }
        response = supabase.table("merged_files").insert(data).execute()
        return response, None
    except Exception as e:
        return None, str(e)

def get_user_history(user_id):
    supabase = get_supabase_client()
    if not supabase:
        return []

    try:
        response = supabase.table("merged_files").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        print(f"Error fetching history: {e}")
        return []
