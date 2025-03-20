import streamlit as st

st.title("📍 Google Maps no Streamlit")

# Define a localização inicial
latitude = -23.55052
longitude = -46.633308

# URL do Google Maps com coordenadas dinâmicas
maps_url = f"https://www.google.com/maps/embed/v1/place?key=SUA_GOOGLE_MAPS_API_KEY&q={latitude},{longitude}"

# Exibir o Google Maps como um iframe
st.components.v1.iframe(maps_url, width=700, height=500)
