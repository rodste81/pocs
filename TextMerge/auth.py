import streamlit as st
from database import get_supabase_client
import time

def show_login_page():
    st.markdown("<h1 style='text-align: center;'>Welcome to TextMerge</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center;'>Merge your code files effortlessly.</p>", unsafe_allow_html=True)
    
    tab1, tab2 = st.tabs(["Login", "Sign Up"])

    supabase = get_supabase_client()
    if not supabase:
        st.error("Supabase is not configured. Please set SUPABASE_URL and SUPABASE_KEY.")
        return

    with tab1:
        email = st.text_input("Email", key="login_email")
        password = st.text_input("Password", type="password", key="login_password")
        if st.button("Login"):
            try:
                response = supabase.auth.sign_in_with_password({"email": email, "password": password})
                st.session_state["user"] = response.user
                st.success("Logged in successfully!")
                st.rerun()
            except Exception as e:
                st.error(f"Login failed: {e}")

    with tab2:
        new_email = st.text_input("Email", key="signup_email")
        new_password = st.text_input("Password", type="password", key="signup_password")
        if st.button("Sign Up"):
            try:
                response = supabase.auth.sign_up({"email": new_email, "password": new_password})
                st.success("Sign up successful! Please check your email to confirm.")
            except Exception as e:
                st.error(f"Sign up failed: {e}")

def logout():
    supabase = get_supabase_client()
    supabase.auth.sign_out()
    st.session_state["user"] = None
    st.rerun()
