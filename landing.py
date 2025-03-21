import streamlit as st

# Definir a página
st.set_page_config(page_title="LoveYuu", layout="wide")

# CSS customizado para reproduzir o design
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap');

html, body, [class*="css"] {
    font-family: 'Poppins', sans-serif;
    background-color: #050B1A;
    color: white;
}

.big-title {
    font-size: 60px;
    font-weight: 800;
    line-height: 1;
    margin-bottom: 0;
    color: #fff;
}

.big-title span{
    color: #FF6A88;
}

.subtitle {
    font-size: 20px;
    font-weight: 400;
    margin-top: 20px;
}

.highlight {
    color: #FF6A88;
}

.button {
    background-color: #FF6A88;
    padding: 15px 40px;
    border-radius: 12px;
    color: white;
    text-decoration: none;
    font-weight: 600;
    box-shadow: 0 0 20px rgba(255, 106, 136, 0.6);
}

.button:hover{
    background-color: #FF5270;
    box-shadow: 0 0 25px rgba(255, 106, 136, 0.8);
    color: white;
    text-decoration: none;
}

.container {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    height: 90vh;
    padding-left: 50px;
}

.image-container {
    position: absolute;
    right: 50px;
    top: 20%;
}

</style>
""", unsafe_allow_html=True)


# Layout principal
col1, col2 = st.columns([1,1])

with col1:
    st.markdown('<div class="container">'
                '<div class="big-title">Surprise<br><span>your love</span></div>'
                '<div class="subtitle">'
                'Create a dynamic time counter for your relationship.<br>'
                'Share with your love and make an <span class="highlight">unforgettable surprise gift.</span><br>'
                'Just point to the QR Code 💕'
                '</div><br>'
                '<a href="#" class="button">Create my site</a>'
                '</div>', unsafe_allow_html=True)

with col2:
    st.image("https://i.imgur.com/W9rT0VC.png", width=500)  # Coloque a URL da imagem correspondente aqui
