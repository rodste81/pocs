import streamlit as st

# Definir a página
st.set_page_config(page_title="LoveYuu", layout="wide")

# CSS customizado para reproduzir o design original
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap');

html, body, [class*="css"] {
    font-family: 'Poppins', sans-serif;
    background-color: #000;
    color: white;
}

.main-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 100px;
}

.text-container {
    text-align: center;
    max-width: 500px;
}

.big-title {
    font-size: 60px;
    font-weight: 800;
    line-height: 1.1;
    color: #ffffff;
}

.big-title span {
    color: #FF7B9E;
}

.subtitle {
    font-size: 18px;
    margin-top: 20px;
    line-height: 1.5;
    color: #ffffff;
}

.subtitle .highlight {
    color: #FF7B9E;
}

.button {
    display: inline-block;
    margin-top: 30px;
    background-color: #FF7B9E;
    padding: 12px 40px;
    border-radius: 8px;
    color: white;
    text-decoration: none;
    font-weight: 600;
    box-shadow: 0 0 20px rgba(255, 123, 158, 0.7);
}

.button:hover {
    background-color: #ff5c81;
    box-shadow: 0 0 25px rgba(255, 123, 158, 0.9);
}

.image-container img {
    width: 400px;
}

</style>
""", unsafe_allow_html=True)

# Layout principal centralizado
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
