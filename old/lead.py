import streamlit as st

st.title("Cadastrar Lead")

with st.form("lead_form"):
    nome = st.text_input("Nome do Cliente")
    email = st.text_input("E-mail")
    telefone = st.text_input("Telefone")
    
    submit_button = st.form_submit_button("Salvar Lead")

if submit_button:
    st.success(f"✅ Lead **{nome}** cadastrado com sucesso!")
