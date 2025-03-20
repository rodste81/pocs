import streamlit as st

# 🎨 Estilos personalizados
st.markdown(
    """
    <style>
        body {
            background: linear-gradient(to right, #4facfe, #00f2fe);
        }
        .main-container {
            background-color: white;
            padding: 50px;
            border-radius: 10px;
            box-shadow: 0px 4px 15px rgba(0, 0, 0, 0.2);
            text-align: center;
            width: 80%;
            margin: auto;
        }
        .title {
            font-size: 42px;
            font-weight: bold;
            color: #333;
        }
        .subtitle {
            font-size: 20px;
            color: #555;
            margin-bottom: 20px;
        }
        .highlight {
            color: #4facfe;
            font-weight: bold;
        }
        .btn {
            background-color: #4facfe;
            color: white;
            font-size: 18px;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: bold;
            display: inline-block;
            margin-top: 20px;
        }
        .btn:hover {
            background-color: #00d4ff;
        }
        .feature-card {
            background-color: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 2px 2px 15px rgba(0, 0, 0, 0.1);
            text-align: center;
            margin: 10px;
        }
        .feature-icon {
            font-size: 40px;
            color: #4facfe;
        }
        .footer {
            margin-top: 30px;
            font-size: 14px;
            color: #777;
        }
    </style>
    """,
    unsafe_allow_html=True,
)

# 📌 Criando o container principal
st.markdown('<div class="main-container">', unsafe_allow_html=True)

# 🦷 **Título da Página**
st.markdown('<h1 class="title">Sorria com Confiança!</h1>', unsafe_allow_html=True)
st.markdown(
    '<p class="subtitle">O melhor sistema para <span class="highlight">dentistas</span> organizarem seus atendimentos, pacientes e agenda.</p>',
    unsafe_allow_html=True,
)

# 🔹 **Login do dentista**
st.markdown("<h3>🔑 Área do Dentista</h3>", unsafe_allow_html=True)
email = st.text_input("E-mail", placeholder="Digite seu e-mail")
senha = st.text_input("Senha", type="password", placeholder="Digite sua senha")
if st.button("Entrar", key="login"):
    st.success(f"Bem-vindo, {email.split('@')[0]}!")

st.markdown('<a href="#" class="btn">Saiba Mais</a>', unsafe_allow_html=True)

# 📌 **Destaques dos serviços**
st.markdown("<h3>🦷 Por que usar nosso sistema?</h3>", unsafe_allow_html=True)

col1, col2, col3 = st.columns(3)

with col1:
    st.markdown(
        '<div class="feature-card"><p class="feature-icon">📅</p><p><strong>Agenda Inteligente</strong></p><p>Gerencie consultas e encaixes de forma automatizada.</p></div>',
        unsafe_allow_html=True,
    )

with col2:
    st.markdown(
        '<div class="feature-card"><p class="feature-icon">👨‍⚕️</p><p><strong>Prontuário Digital</strong></p><p>Armazene histórico e exames dos seus pacientes.</p></div>',
        unsafe_allow_html=True,
    )

with col3:
    st.markdown(
        '<div class="feature-card"><p class="feature-icon">📊</p><p><strong>Gestão Financeira</strong></p><p>Controle pagamentos e fluxo de caixa.</p></div>',
        unsafe_allow_html=True,
    )

# 📌 **Rodapé**
st.markdown(
    '<p class="footer">© 2025 - Sistema para Dentistas. Todos os direitos reservados.</p>',
    unsafe_allow_html=True,
)

st.markdown('</div>', unsafe_allow_html=True)  # Fecha o container principal
