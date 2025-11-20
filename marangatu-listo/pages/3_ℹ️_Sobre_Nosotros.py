import streamlit as st

st.set_page_config(
    page_title="Sobre Nosotros - MarangatuListo",
    page_icon="ℹ️",
    layout="wide"
)

# CSS personalizado
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');

* {
    font-family: 'Poppins', sans-serif;
}

.stApp {
    background: linear-gradient(135deg, #F8F9FA 0%, #E9ECEF 100%);
}

.hero {
    text-align: center;
    padding: 3rem 0;
}

.hero h1 {
    font-size: 3rem;
    background: linear-gradient(135deg, #7B2CBF 0%, #FF6B35 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 1rem;
}

.hero p {
    font-size: 1.3rem;
    color: #6B7280;
    max-width: 800px;
    margin: 0 auto;
    line-height: 1.6;
}

.feature-card {
    background: white;
    padding: 2rem;
    border-radius: 20px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.08);
    text-align: center;
    transition: transform 0.3s;
}

.feature-card:hover {
    transform: translateY(-5px);
}

.feature-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.feature-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #2D3748;
    margin-bottom: 0.5rem;
}

.feature-description {
    color: #6B7280;
    line-height: 1.6;
}

.team-section {
    background: white;
    padding: 3rem;
    border-radius: 20px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.08);
    margin: 3rem 0;
}

.contact-card {
    background: linear-gradient(135deg, #7B2CBF 0%, #9D4EDD 100%);
    color: white;
    padding: 3rem;
    border-radius: 20px;
    text-align: center;
    margin: 2rem 0;
}

.contact-card h2 {
    color: white;
    margin-bottom: 1rem;
}

.btn-contact {
    background: white;
    color: #7B2CBF;
    padding: 1rem 2rem;
    border-radius: 50px;
    border: none;
    font-weight: 600;
    font-size: 1.1rem;
    cursor: pointer;
    transition: all 0.3s;
    text-decoration: none;
    display: inline-block;
}

.btn-contact:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255,255,255,0.3);
}
</style>
""", unsafe_allow_html=True)

def main():
    # Hero
    st.markdown("""
    <div class="hero">
        <h1>🚀 MarangatuListo</h1>
        <p>
            Somos una plataforma innovadora que facilita la gestión de facturas 
            para usuarios paraguayos. Con tecnología de inteligencia artificial, 
            hacemos que el registro de tus gastos sea simple, rápido y eficiente.
        </p>
    </div>
    """, unsafe_allow_html=True)
    
    # Features
    st.markdown("## 💡 ¿Qué Hacemos?")
    st.markdown("<br>", unsafe_allow_html=True)
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("""
        <div class="feature-card">
            <div class="feature-icon">📱</div>
            <div class="feature-title">Escaneo Inteligente</div>
            <div class="feature-description">
                Usa tu cámara para capturar facturas y nuestro sistema 
                extrae automáticamente toda la información usando IA
            </div>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown("""
        <div class="feature-card">
            <div class="feature-icon">💾</div>
            <div class="feature-title">Almacenamiento Seguro</div>
            <div class="feature-description">
                Tus datos están protegidos con tecnología de última 
                generación y accesibles desde cualquier dispositivo
            </div>
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        st.markdown("""
        <div class="feature-card">
            <div class="feature-icon">📊</div>
            <div class="feature-title">Reportes Detallados</div>
            <div class="feature-description">
                Visualiza tus gastos, genera reportes y exporta 
                tus datos en formato Excel cuando lo necesites
            </div>
        </div>
        """, unsafe_allow_html=True)
    
    # Misión y Visión
    st.markdown("<br><br>", unsafe_allow_html=True)
    st.markdown("""
    <div class="team-section">
        <h2 style="text-align: center; color: #2D3748; margin-bottom: 2rem;">🎯 Nuestra Misión</h2>
        <p style="text-align: center; color: #6B7280; font-size: 1.1rem; line-height: 1.8; max-width: 800px; margin: 0 auto;">
            Facilitar la gestión financiera de personas y empresas paraguayas a través de 
            tecnología accesible e innovadora. Creemos que todos merecen herramientas simples 
            para organizar sus finanzas sin complicaciones.
        </p>
    </div>
    """, unsafe_allow_html=True)
    
    # Tecnología
    st.markdown("## 🔧 Tecnología")
    st.markdown("<br>", unsafe_allow_html=True)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("""
        ### ⚡ Powered by AI
        - **Google Gemini AI** para extracción de datos
        - **Streamlit** para una experiencia fluida
        - **Supabase** para almacenamiento seguro
        """)
    
    with col2:
        st.markdown("""
        ### 🔒 Seguridad
        - Encriptación end-to-end
        - Autenticación multi-factor
        - Cumplimiento con LGPD
        """)
    
    # Contacto
    st.markdown("""
    <div class="contact-card">
        <h2>📧 ¿Tienes Preguntas?</h2>
        <p style="font-size: 1.1rem; margin-bottom: 2rem;">
            Estamos aquí para ayudarte. Contáctanos y responderemos a la brevedad.
        </p>
        <a href="mailto:contacto@marangatu-listo.com" class="btn-contact">
            📩 Enviar Mensaje
        </a>
    </div>
    """, unsafe_allow_html=True)
    
    # Footer
    st.markdown("<br><br>", unsafe_allow_html=True)
    st.markdown("""
    <div style="text-align: center; color: #6B7280; padding: 2rem;">
        <p>© 2025 MarangatuListo. Todos los derechos reservados.</p>
        <p style="margin-top: 0.5rem;">
            Hecho con ❤️ en Paraguay 🇵🇾
        </p>
    </div>
    """, unsafe_allow_html=True)

if __name__ == "__main__":
    main()
