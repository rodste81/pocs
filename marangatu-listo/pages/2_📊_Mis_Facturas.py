import streamlit as st
from components.auth import verificar_autenticacion, obtener_usuario, cerrar_sesion
from services.supabase_client import get_supabase_client
import pandas as pd
from datetime import datetime

st.set_page_config(
    page_title="Mis Facturas - MarangatuListo",
    page_icon="📊",
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

.top-header {
    background: white;
    padding: 1rem 2rem;
    border-radius: 15px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    margin-bottom: 2rem;
}

.stats-card {
    background: white;
    padding: 1.5rem;
    border-radius: 15px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.08);
    text-align: center;
}

.stats-value {
    font-size: 2.5rem;
    font-weight: 700;
    color: #7B2CBF;
    margin: 0.5rem 0;
}

.stats-label {
    color: #6B7280;
    font-size: 0.9rem;
}

.factura-card {
    background: white;
    padding: 1.5rem;
    border-radius: 15px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    margin-bottom: 1rem;
    transition: transform 0.3s, box-shadow 0.3s;
}

.factura-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.12);
}

.factura-local {
    font-size: 1.2rem;
    font-weight: 600;
    color: #2D3748;
    margin-bottom: 0.5rem;
}

.factura-valor {
    font-size: 1.8rem;
    font-weight: 700;
    color: #FF6B35;
    margin: 0.5rem 0;
}

.factura-info {
    color: #6B7280;
    font-size: 0.9rem;
    margin-top: 0.5rem;
}
</style>
""", unsafe_allow_html=True)

def main():
    # Verificar autenticação
    if not verificar_autenticacion():
        st.warning("⚠️ Debes iniciar sesión para acceder a esta página")
        st.switch_page("app.py")
        return
    
    usuario = obtener_usuario()
    
    # Header
    col1, col2 = st.columns([3, 1])
    with col1:
        st.markdown(f"""
        <div class="top-header">
            <h2 style="margin: 0; color: #7B2CBF;">📊 Mis Facturas</h2>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        if st.button("🚪 Cerrar Sesión", use_container_width=True):
            cerrar_sesion()
            st.rerun()
    
    # Buscar facturas do usuário
    try:
        supabase = get_supabase_client()
        response = supabase.table('facturas').select('*').eq('user_id', usuario['id']).order('created_at', desc=True).execute()
        
        facturas = response.data if response.data else []
        
        if not facturas:
            st.info("📋 Aún no has escaneado ninguna factura. ¡Comienza ahora!")
            if st.button("➕ Escanear Primera Factura", type="primary"):
                st.switch_page("pages/1_📱_Escanear.py")
            return
        
        # Estatísticas
        st.markdown("### 📈 Resumen")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.markdown(f"""
            <div class="stats-card">
                <div class="stats-label">Total de Facturas</div>
                <div class="stats-value">{len(facturas)}</div>
            </div>
            """, unsafe_allow_html=True)
        
        with col2:
            total_gasto = sum(float(f.get('valor', 0) or 0) for f in facturas)
            st.markdown(f"""
            <div class="stats-card">
                <div class="stats-label">Total Gastado</div>
                <div class="stats-value">Gs. {total_gasto:,.0f}</div>
            </div>
            """, unsafe_allow_html=True)
        
        with col3:
            media = total_gasto / len(facturas) if facturas else 0
            st.markdown(f"""
            <div class="stats-card">
                <div class="stats-label">Promedio</div>
                <div class="stats-value">Gs. {media:,.0f}</div>
            </div>
            """, unsafe_allow_html=True)
        
        st.markdown("<br>", unsafe_allow_html=True)
        
        # Filtros
        st.markdown("### 🔍 Filtrar")
        col1, col2, col3 = st.columns(3)
        
        with col1:
            search_local = st.text_input("Buscar por local", placeholder="Nombre del comercio")
        
        with col2:
            fecha_desde = st.date_input("Desde", value=None)
        
        with col3:
            fecha_hasta = st.date_input("Hasta", value=None)
        
        # Filtrar facturas
        facturas_filtradas = facturas
        
        if search_local:
            facturas_filtradas = [f for f in facturas_filtradas if search_local.lower() in (f.get('local', '') or '').lower()]
        
        # Lista de facturas
        st.markdown("### 📋 Historial de Facturas")
        
        for factura in facturas_filtradas:
            col1, col2 = st.columns([3, 1])
            
            with col1:
                st.markdown(f"""
                <div class="factura-card">
                    <div class="factura-local">🏪 {factura.get('local', 'Local no especificado')[:50]}</div>
                    <div class="factura-valor">Gs. {float(factura.get('valor', 0) or 0):,.0f}</div>
                    <div class="factura-info">
                        📅 {factura.get('fecha_factura', 'Fecha no especificada')} | 
                        🏢 RUC: {factura.get('ruc_emisor', 'No especificado')}
                    </div>
                </div>
                """, unsafe_allow_html=True)
            
            with col2:
                if factura.get('image_url'):
                    if st.button("📷 Ver Imagen", key=f"img_{factura['id']}"):
                        st.image(factura['image_url'], caption=f"Factura - {factura.get('local', 'Sin nombre')}")
        
        # Exportar
        st.markdown("### 💾 Exportar Datos")
        if st.button("📥 Descargar Excel", type="primary"):
            df = pd.DataFrame(facturas_filtradas)
            df = df[['fecha_factura', 'local', 'valor', 'ruc_emisor']]
            df.columns = ['Fecha', 'Local', 'Valor (Gs.)', 'RUC Emisor']
            
            # Converter para Excel
            st.download_button(
                label="⬇️ Descargar archivo",
                data=df.to_csv(index=False).encode('utf-8'),
                file_name=f"facturas_{usuario['nombre']}_{datetime.now().strftime('%Y%m%d')}.csv",
                mime="text/csv"
            )
    
    except Exception as e:
        st.error(f"❌ Error al cargar facturas: {str(e)}")

if __name__ == "__main__":
    main()
