from io import StringIO

def merge_files(uploaded_files):
    """
    Merges content of multiple uploaded files into a single string.
    """
    merged_content = ""
    for uploaded_file in uploaded_files:
        # To read file as string:
        stringio = StringIO(uploaded_file.getvalue().decode("utf-8"))
        content = stringio.read()
        
        merged_content += f"\n\n-- START OF FILE: {uploaded_file.name} --\n\n"
        merged_content += content
        merged_content += f"\n\n-- END OF FILE: {uploaded_file.name} --\n"
    
    return merged_content
