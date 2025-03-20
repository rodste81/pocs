import streamlit as st

# 🎨 **Estilos personalizados para corrigir o fundo branco e aplicar um layout bonito**
st.markdown(
    """
    <head>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            body, .stApp {
                background: #E6E6FA !important;  /* Roxinho Lavanda */
            }
            .main-container {
                background-color: rgba(255, 255, 255, 0.9);  /* Branco com leve transparência */
                padding: 50px;
                border-radius: 15px;
                box-shadow: 0px 5px 20px rgba(0, 0, 0, 0.15);
                text-align: center;
                width: 80%;
                margin: auto;
            }
            .title {
                font-family: 'Poppins', sans-serif !important;
                font-size: 40px;
                font-weight: 700;
                text-align: center;
                color: #4B0082;
                margin-bottom: 10px;
            }
            .subtitle {
                font-size: 18px;
                font-family: 'Poppins', sans-serif;
                color: #555;
                margin-bottom: 20px;
            }
            .highlight {
                color: #8A2BE2;
                font-weight: bold;
            }
            .btn {
                background: linear-gradient(to right, #8A2BE2, #6A5ACD);
                color: white;
                font-size: 18px;
                padding: 14px 28px;
                border-radius: 25px;
                text-decoration: none;
                font-weight: bold;
                display: inline-block;
                margin-top: 20px;
                transition: all 0.3s ease;
            }
            .btn:hover {
                background: linear-gradient(to right, #6A5ACD, #8A2BE2);
                transform: scale(1.05);
            }
            .input-box {
                width: 100%;
                padding: 12px;
                border: 2px solid #8A2BE2;
                border-radius: 10px;
                margin-top: 10px;
                font-size: 16px;
                text-align: center;
                font-family: 'Poppins', sans-serif;
            }
            .feature-card {
                background: white;
                padding: 20px;
                border-radius: 12px;
                box-shadow: 3px 3px 20px rgba(0, 0, 0, 0.08);
                text-align: center;
                margin: 15px;
                transition: transform 0.3s ease-in-out;
                font-family: 'Poppins', sans-serif;
            }
            .feature-card:hover {
                transform: scale(1.05);
            }
            .feature-icon {
                font-size: 40px;
                color: #6A5ACD;
            }
            .footer {
                margin-top: 30px;
                font-size: 14px;
                color: #777;
            }
            /* Esconde a barra superior (header) do Streamlit */
            header {visibility: hidden;}
            /* Esconde o menu lateral do Streamlit */
            #MainMenu {visibility: hidden;}
            /* Remove o rodapé "Made with Streamlit" */
            footer {visibility: hidden;}
        </style>
    </head>
    """,
    unsafe_allow_html=True,
)

# 📌 **Container principal**
st.markdown('<div class="main-container">', unsafe_allow_html=True)

# 🦷 **Título & Subtítulo**
st.markdown('<h1 class="title">Transforme Sorrisos, Gerencie seu Consultório!</h1>', unsafe_allow_html=True)
st.markdown(
    '<p class="subtitle">O sistema mais avançado para <span class="highlight">dentistas</span> organizarem consultas, pacientes e pagamentos.</p>',
    unsafe_allow_html=True,
)

# 🔹 **Login do dentista**
st.markdown("<h3>🔑 Acesso Dentista</h3>", unsafe_allow_html=True)
email = st.text_input("E-mail", placeholder="Digite seu e-mail")
senha = st.text_input("Senha", type="password", placeholder="Digite sua senha")
if st.button("Entrar", key="login"):
    st.success(f"Bem-vindo, Dr(a). {email.split('@')[0]}!")

st.markdown('<a href="#" class="btn">Saiba Mais</a>', unsafe_allow_html=True)

# 📌 **Destaques dos serviços**
st.markdown("<h3>🦷 O que oferecemos?</h3>", unsafe_allow_html=True)

col1, col2, col3 = st.columns(3)

with col1:
    st.markdown(
        '<div class="feature-card"><p class="feature-icon">📅</p><p><strong>Agenda Inteligente</strong></p><p>Agendamentos otimizados e sem conflitos.</p></div>',
        unsafe_allow_html=True,
    )

with col2:
    st.markdown(
        '<div class="feature-card"><p class="feature-icon">👨‍⚕️</p><p><strong>Prontuário Digital</strong></p><p>Registre histórico, exames e evoluções dos pacientes.</p></div>',
        unsafe_allow_html=True,
    )

with col3:
    st.markdown(
        '<div class="feature-card"><p class="feature-icon">📊</p><p><strong>Controle Financeiro</strong></p><p>Acompanhe receitas e despesas com facilidade.</p></div>',
        unsafe_allow_html=True,
    )

# 📌 **Rodapé**
st.markdown(
    '<p class="footer">© 2025 - Sistema para Consultórios Odontológicos. Todos os direitos reservados.</p>',
    unsafe_allow_html=True,
)

st.markdown('</div>', unsafe_allow_html=True)  # Fecha o container principal
