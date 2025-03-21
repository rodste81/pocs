import streamlit as st

# Definir a página
st.set_page_config(page_title="LoveYuu", layout="wide")

# CSS customizado para reproduzir o design
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap');

body, html, [class*="css"] {
    font-family: 'Poppins', sans-serif;
    background-color: #020814;
    color: white;
}

.main-container {
    display: flex;
    align-items: center;
    justify-content: space-around;
    height: 100vh;
    padding: 0 100px;
}

.text-container {
    max-width: 550px;
}

.big-title {
    font-size: 72px;
    font-weight: 800;
    line-height: 1;
    margin-bottom: 10px;
    color: #FFBBCD;
}

.big-title span {
    color: #FF5C81;
}

.subtitle {
    font-size: 22px;
    font-weight: 400;
    margin-bottom: 30px;
    line-height: 1.5;
}

.highlight {
    color: #FF5C81;
}

.button {
    display: inline-block;
    background-color: #FF5C81;
    padding: 15px 30px;
    border-radius: 12px;
    color: white;
    text-decoration: none;
    font-weight: 600;
    box-shadow: 0 0 20px rgba(255, 92, 129, 0.6);
    transition: all 0.3s ease;
}

.button:hover {
    background-color: #FF4069;
    box-shadow: 0 0 30px rgba(255, 92, 129, 0.8);
    color: white;
}

.image-container img {
    width: 450px;
}

</style>
""", unsafe_allow_html=True)

# Layout principal
st.markdown('''
<div class="main-container">
    <div class="text-container">
        <div class="big-title">Surprise<br><span>your love</span></div>
        <div class="subtitle">
            Create a dynamic time counter for your relationship.<br>
            Share with your love and make an <span class="highlight">unforgettable surprise gift.</span><br>
            Just point to the QR Code 💕
        </div>
        <a href="#" class="button">Create my site</a>
    </div>
    <div class="image-container">
        <img src="https://i.imgur.com/W9rT0VC.png">
    </div>
</div>
''', unsafe_allow_html=True)
