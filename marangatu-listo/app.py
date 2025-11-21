import streamlit as st
from PIL import Image
from components.auth import inicializar_sesion, login, registrar_usuario, verificar_autenticacion
import base64
from pathlib import Path

# Configuração da página
st.set_page_config(
    page_title="MarangatuListo - Gestión de Facturas",
    page_icon="📱",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# CSS personalizado com tema roxo e laranja
def load_css():
    st.markdown("""
    <style>
    /* Importar fontes */
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap');
    
    /* Reset e configurações gerais */
    * {
        font-family: 'Poppins', sans-serif;
    }
    
    /* Esconder elementos padrão do Streamlit */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
    /* Background gradient */
    .stApp {
        background: linear-gradient(135deg, #F8F9FA 0%, #E9ECEF 100%);
    }
    
    /* Container principal */
    .main-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
    }
    
    /* Header */
    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 2rem;
        background: white;
        border-radius: 15px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        margin-bottom: 3rem;
    }
    
    .logo-text {
        font-size: 1.8rem;
        font-weight: 700;
        background: linear-gradient(135deg, #7B2CBF 0%, #FF6B35 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }
    
    .nav-menu {
        display: flex;
        gap: 2rem;
    }
    
    .nav-link {
        color: #6B7280;
        text-decoration: none;
        font-weight: 500;
        transition: color 0.3s;
    }
    
    .nav-link:hover {
        color: #7B2CBF;
    }
    
    /* Hero Section */
    .hero-section {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4rem;
        align-items: center;
        margin: 4rem 0;
    }
    
    .hero-text h1 {
        font-size: 3rem;
        color: #2D3748;
        margin-bottom: 1rem;
        line-height: 1.2;
    }
    
    .hero-text .highlight {
        color: #7B2CBF;
        font-weight: 700;
    }
    
    .hero-text p {
        font-size: 1.1rem;
        color: #6B7280;
        line-height: 1.6;
        margin-bottom: 2rem;
    }
    
    /* Botões hero */
    .hero-buttons {
        display: flex;
        gap: 1rem;
        margin-top: 2rem;
    }
    
    .btn-primary {
        background: linear-gradient(135deg, #7B2CBF 0%, #9D4EDD 100%);
        color: white;
        padding: 1rem 2rem;
        border-radius: 50px;
        border: none;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
        transition: transform 0.3s, box-shadow 0.3s;
        box-shadow: 0 4px 15px rgba(123, 44, 191, 0.3);
    }
    
    .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(123, 44, 191, 0.4);
    }
    
    .btn-secondary {
        background: white;
        color: #7B2CBF;
        padding: 1rem 2rem;
        border-radius: 50px;
        border: 2px solid #7B2CBF;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.3s;
    }
    
    .btn-secondary:hover {
        background: #7B2CBF;
        color: white;
    }
    
    /* Login/Register Card (Styled Form) */
    [data-testid="stForm"] {
        background: white;
        padding: 3rem;
        border-radius: 20px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        max-width: 450px;
        margin: 0 auto;
        border: none;
    }
    
    [data-testid="stForm"] h2 {
        color: #2D3748;
        font-size: 2rem;
        margin-bottom: 0.5rem;
        text-align: center;
    }
    
    [data-testid="stForm"] p {
        color: #6B7280;
        text-align: center;
        margin-bottom: 2rem;
    }
    
    /* Form inputs */
    .stTextInput > div > div > input {
        border-radius: 10px;
        border: 2px solid #E5E7EB;
        padding: 0.75rem 1rem;
        font-size: 1rem;
        transition: border-color 0.3s;
    }
    
    .stTextInput > div > div > input:focus {
        border-color: #7B2CBF;
        box-shadow: 0 0 0 3px rgba(123, 44, 191, 0.1);
    }
    
    .stTextInput > label {
        color: #4B5563;
        font-weight: 500;
        margin-bottom: 0.5rem;
    }
    
    /* Botão de submit */
    .stButton > button {
        width: 100%;
        background: linear-gradient(135deg, #7B2CBF 0%, #9D4EDD 100%);
        color: white;
        padding: 0.75rem 1rem;
        border-radius: 10px;
        border: none;
        font-weight: 600;
        font-size: 1.1rem;
        cursor: pointer;
        transition: transform 0.3s, box-shadow 0.3s;
        box-shadow: 0 4px 15px rgba(123, 44, 191, 0.3);
    }
    
    .stButton > button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(123, 44, 191, 0.4);
    }
    
    /* Links */
    .auth-links {
        text-align: center;
        margin-top: 1.5rem;
    }
    
    .auth-links a {
        color: #7B2CBF;
        text-decoration: none;
        font-weight: 500;
    }
    
    .auth-links a:hover {
        text-decoration: underline;
    }
    
    /* Checkbox */
    .stCheckbox {
        margin: 1rem 0;
    }
    
    /* Mobile responsivo */
    @media (max-width: 768px) {
        .hero-section {
            grid-template-columns: 1fr;
            gap: 2rem;
        }
        
        .hero-text h1 {
            font-size: 2rem;
        }
        
        .header {
            flex-direction: column;
            gap: 1rem;
        }
        
        .nav-menu {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
        }
    }
    
    /* Success/Error messages */
    .stAlert {
        border-radius: 10px;
        border-left: 4px solid #FF6B35;
    }
    </style>
    """, unsafe_allow_html=True)

def mostrar_hero():
    """Mostra a seção hero da página inicial"""
    st.markdown("""
    <div class="hero-section">
        <div class="hero-text">
            <h1>¡Hola, <span class="highlight">Amigo</span>! 👋</h1>
            <p>
                Inicia tu camino hacia la eficiencia con <strong>MarangatuListo</strong>. 
                Gestiona tus facturas de forma simple, capturando y almacenando datos 
                con solo una foto. ¡Todo fácil y sustentable!
            </p>
        </div>
    </div>
    """, unsafe_allow_html=True)

def mostrar_login():
    """Mostra o formulário de login"""
    
    with st.form("login_form"):
        st.markdown('<h2>🔐 Iniciar Sesión</h2>', unsafe_allow_html=True)
        st.markdown('<p>Ingresa tus credenciales para acceder</p>', unsafe_allow_html=True)
        
        email = st.text_input("📧 E-Mail", placeholder="tu@email.com")
        password = st.text_input("🔒 Contraseña", type="password", placeholder="••••••••")
        recordar = st.checkbox("Recordarme por 30 días")
        
        submitted = st.form_submit_button("🚀 Acceder")
        
        if submitted:
            if email and password:
                success, error = login(email, password)
                if success:
                    st.success("✅ ¡Inicio de sesión exitoso!")
                    st.rerun()
                else:
                    st.error(f"❌ {error}")
            else:
                st.warning("⚠️ Por favor, completa todos los campos")
    
    st.markdown('<div class="auth-links">', unsafe_allow_html=True)
    st.markdown('¿Olvidaste tu <a href="#">contraseña</a>?', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)

def mostrar_registro():
    """Mostra o formulário de registro"""
    
    with st.form("register_form"):
        st.markdown('<h2>📝 Crear Cuenta</h2>', unsafe_allow_html=True)
        st.markdown('<p>Regístrate para comenzar a usar MarangatuListo</p>', unsafe_allow_html=True)
        
        nombre = st.text_input("👤 Nombre Completo", placeholder="Juan Pérez")
        ruc = st.text_input("🏢 RUC", placeholder="12345678-9")
        email = st.text_input("📧 E-Mail", placeholder="tu@email.com")
        password = st.text_input("🔒 Contraseña", type="password", placeholder="••••••••")
        password_confirm = st.text_input("🔒 Confirmar Contraseña", type="password", placeholder="••••••••")
        
        acepto_terminos = st.checkbox("Acepto los términos y condiciones")
        
        submitted = st.form_submit_button("✅ Registrarse")
        
        if submitted:
            if not all([nombre, ruc, email, password, password_confirm]):
                st.warning("⚠️ Por favor, completa todos los campos")
            elif password != password_confirm:
                st.error("❌ Las contraseñas no coinciden")
            elif not acepto_terminos:
                st.warning("⚠️ Debes aceptar los términos y condiciones")
            else:
                success, error = registrar_usuario(email, password, nombre, ruc)
                if success:
                    st.success("✅ ¡Registro exitoso! Por favor, verifica tu email.")
                else:
                    st.error(f"❌ {error}")

def main():
    # Cargar CSS
    load_css()
    
    # Inicializar sesión
    inicializar_sesion()
    
    # Header
    st.markdown("""
    <div class="header">
        <div class="logo-text">📱 MarangatuListo</div>
        <div class="nav-menu">
            <a href="#" class="nav-link">Inicio</a>
            <a href="#" class="nav-link">Sobre Nosotros</a>
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    # Verificar se está autenticado
    if verificar_autenticacion():
        st.switch_page("pages/1_📱_Escanear.py")
    else:
        # Tabs para Login e Registro
        col1, col2, col3 = st.columns([1, 2, 1])
        
        with col2:
            mostrar_hero()
            
            tab1, tab2 = st.tabs(["🔐 Iniciar Sesión", "📝 Registrarse"])
            
            with tab1:
                mostrar_login()
            
            with tab2:
                mostrar_registro()

if __name__ == "__main__":
    main()
