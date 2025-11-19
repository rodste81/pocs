import streamlit as st
import pandas as pd
from datetime import datetime
from auth import show_login_page, logout
from file_processor import merge_files
from database import save_merged_file, get_user_history

# Page Config
st.set_page_config(page_title="TextMerge", page_icon="📄", layout="wide")

# Load Custom CSS
with open("styles.css") as f:
    st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

# Initialize Session State
if "user" not in st.session_state:
    st.session_state["user"] = None

def main():
    # Authentication Check
    if not st.session_state["user"]:
        show_login_page()
        return

    user = st.session_state["user"]
    
    # Sidebar - History & User Info
    with st.sidebar:
        st.title("TextMerge")
        st.write(f"Logged in as: {user.email}")
        if st.button("Logout"):
            logout()
        
        st.markdown("---")
        st.subheader("History")
        history = get_user_history(user.id)
        if history:
            for item in history:
                with st.expander(f"{item['filename']} ({item['created_at'][:10]})"):
                    st.code(item['content'][:200] + "...", language="text")
                    st.download_button(
                        label="Download",
                        data=item['content'],
                        file_name=item['filename'],
                        mime="text/plain",
                        key=item['id']
                    )
        else:
            st.info("No merge history found.")

    # Main Content
    st.title("Merge Your Files")
    st.markdown("Upload multiple text files (SQL, KSH, Python, etc.) and merge them into one.")

    uploaded_files = st.file_uploader("Choose files", accept_multiple_files=True)

    if uploaded_files:
        if st.button("Merge Files"):
            with st.spinner("Merging files..."):
                merged_content = merge_files(uploaded_files)
                
                # Generate filename
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"results_{timestamp}.txt"
                
                # Save to Supabase
                _, error = save_merged_file(user.id, filename, merged_content)
                
                if error:
                    st.error(f"Failed to save to database: {error}")
                else:
                    st.success(f"Successfully merged {len(uploaded_files)} files!")
                    
                    # Show Result
                    st.subheader("Merged Content Preview")
                    st.text_area("Preview", merged_content, height=300)
                    
                    st.download_button(
                        label="Download Merged File",
                        data=merged_content,
                        file_name=filename,
                        mime="text/plain"
                    )

if __name__ == "__main__":
    main()
