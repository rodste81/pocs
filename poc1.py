import streamlit as st
from streamlit_extras.switch_page_button import switch_page

# 🔹 Configuração da página
st.set_page_config(page_title="Dashboard", layout="wide")

# 🔹 Estilos CSS para sombras e ícones
st.markdown("""
    <style>
        .big-font {
            font-size:20px !important;
            font-weight: bold;
        }
        .small-font {
            font-size:14px !important;
            color: #666;
        }
        .card {
            background-color: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 2px 2px 15px rgba(0, 0, 0, 0.1);
            text-align: center;
            cursor: pointer;
        }
        .card:hover {
            background-color: #f8f9fa;
        }
        .icon {
            font-size: 30px;
            color: #4F8BF9;
        }
        .sidebar .sidebar-content {
            background-color: #F8F9FA;
        }
    </style>
""", unsafe_allow_html=True)

# 🔹 Sidebar com Ícones
st.sidebar.title("📊 FreeLancer Dashboard")
st.sidebar.markdown("## Navegação")
st.sidebar.button("📋 Início")
st.sidebar.button("📅 Calendário")
st.sidebar.button("📂 Projetos")
st.sidebar.button("💰 Finanças")

# 🔹 Seção de Boas-Vindas
st.markdown("<h2>Bom dia, pronto para trabalhar? 🚀</h2>", unsafe_allow_html=True)
st.markdown("<p class='small-font'>Mantenha o controle das suas tarefas e finanças.</p>", unsafe_allow_html=True)

# 🔹 Botões de Ação com Ícones
col1, col2, col3, col4, col5 = st.columns(5)

with col1:
    if st.button("📇 Cadastrar Lead"):
        switch_page("lead")  # Leva para a página de cadastro de leads

with col2:
    st.markdown("<div class='card'><p class='icon'>📁</p><p class='big-font'>Criar Projeto</p></div>", unsafe_allow_html=True)

with col3:
    st.markdown("<div class='card'><p class='icon'>📝</p><p class='big-font'>Criar Proposta</p></div>", unsafe_allow_html=True)

with col4:
    st.markdown("<div class='card'><p class='icon'>✍️</p><p class='big-font'>Criar Contrato</p></div>", unsafe_allow_html=True)

with col5:
    st.markdown("<div class='card'><p class='icon'>💳</p><p class='big-font'>Registrar Movimento</p></div>", unsafe_allow_html=True)

# 🔹 Seção de Finanças
st.markdown("---")
st.markdown("<h3>💰 Suas Finanças</h3>", unsafe_allow_html=True)

col1, col2, col3 = st.columns(3)

with col1:
    st.markdown("<div class='card'><p class='small-font'>Receita Recebida</p><p class='big-font'>R$ 1.000,00</p></div>", unsafe_allow_html=True)

with col2:
    st.markdown("<div class='card'><p class='small-font'>Gastos Pagos</p><p class='big-font' style='color:red;'>R$ 210,00</p></div>", unsafe_allow_html=True)

with col3:
    st.markdown("<div class='card'><p class='small-font'>Lucro Total</p><p class='big-font' style='color:green;'>R$ 790,00</p></div>", unsafe_allow_html=True)

# 🔹 Projetos Ativos
st.markdown("---")
st.markdown("<h3>📂 Seus Projetos Ativos</h3>", unsafe_allow_html=True)

st.table({
    "Projeto": ["Consultoria de SaaS - MRS", "Ajudar a Asa Assessoria", "Desenvolvimento do Site"],
    "Cliente": ["MRS Consultoria", "Pessoa de Teste", "André Ribeiro"],
    "Status": ["Em andamento", "Em andamento", "Em andamento"],
    "Prazo": ["Conclui em 5 dias", "Conclui em 10 dias", "Conclui em 15 dias"]
})
