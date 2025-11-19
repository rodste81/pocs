# TextMerge

A Streamlit application to merge multiple text files into one, with Supabase authentication and history tracking.

## Setup

1.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

2.  **Supabase Setup**:
    - Create a project at [supabase.com](https://supabase.com).
    - Run the SQL in `supabase_schema.sql` in the Supabase SQL Editor.
    - Get your URL and Key from Project Settings > API.

3.  **Environment Variables**:
    Create a `.env` file or `.streamlit/secrets.toml`:
    ```toml
    SUPABASE_URL = "your_url"
    SUPABASE_KEY = "your_key"
    ```

4.  **Run**:
    ```bash
    streamlit run app.py
    ```
