import streamlit as st
from services.supabase_client import get_supabase_client
from typing import Optional, Dict

def inicializar_sesion():
    """Inicializa variables de sesión"""
    if 'usuario' not in st.session_state:
        st.session_state.usuario = None
    if 'autenticado' not in st.session_state:
        st.session_state.autenticado = False

def login(email: str, password: str) -> tuple[bool, Optional[str]]:
    """  
    Realiza login del usuario
    
    Returns:
        (success, error_message)
    """
    try:
        supabase = get_supabase_client()
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        if response.user:
            # Buscar datos adicionales del usuario
            user_data = supabase.table('users').select('*').eq('id', response.user.id).execute()
            
            if user_data.data:
                st.session_state.usuario = user_data.data[0]
                st.session_state.autenticado = True
                return True, None
            else:
                return False, "Usuario no encontrado en la base de datos"
        else:
            return False, "Credenciales inválidas"
            
    except Exception as e:
        return False, f"Error al iniciar sesión: {str(e)}"

def registrar_usuario(email: str, password: str, nombre: str, ruc: str) -> tuple[bool, Optional[str]]:
    """
    Registra un nuevo usuario
    
    Returns:
        (success, error_message)
    """
    try:
        supabase = get_supabase_client()
        
        # Crear usuario en Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": email,
            "password": password
        })
        
        if auth_response.user:
            # Insertar datos adicionales en la tabla users
            user_data = {
                "id": auth_response.user.id,
                "email": email,
                "nombre": nombre,
                "ruc": ruc,
                "rol": "usuario"
            }
            
            supabase.table('users').insert(user_data).execute()
            
            return True, None
        else:
            return False, "Error al crear usuario"
            
    except Exception as e:
        return False, f"Error al registrar: {str(e)}"

def cerrar_sesion():
    """Cierra la sesión del usuario"""
    try:
        supabase = get_supabase_client()
        supabase.auth.sign_out()
        st.session_state.usuario = None
        st.session_state.autenticado = False
        return True
    except Exception as e:
        st.error(f"Error al cerrar sesión: {str(e)}")
        return False

def verificar_autenticacion() -> bool:
    """Verifica si el usuario está autenticado"""
    return st.session_state.get('autenticado', False)

def obtener_usuario() -> Optional[Dict]:
    """Retorna los datos del usuario actual"""
    return st.session_state.get('usuario', None)
