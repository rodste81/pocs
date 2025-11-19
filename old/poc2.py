import streamlit as st
import folium
from streamlit_folium import folium_static

# Configuração da página
st.set_page_config(page_title="Mapa Interativo", layout="wide")

# Centraliza o mapa em uma localização específica (latitude, longitude)
lat_inicial, lon_inicial = -23.5505, -46.6333  # São Paulo, Brasil

# Criar mapa com OpenStreetMap
m = folium.Map(location=[lat_inicial, lon_inicial], zoom_start=12)

# Adiciona um marcador no mapa
folium.Marker(
    location=[lat_inicial, lon_inicial],
    popup="Marco Zero de São Paulo",
    icon=folium.Icon(color="blue", icon="info-sign")
).add_to(m)

# Exibe o mapa no Streamlit
st.title("📍 Mapa Interativo - OpenStreetMap")
folium_static(m)
