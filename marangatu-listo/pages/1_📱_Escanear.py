import streamlit as st
from components.auth import verificar_autenticacion, obtener_usuario, cerrar_sesion
from services.ocr_service import ocr_service
from services.supabase_client import get_supabase_client
from PIL import Image
import io
from datetime import datetime
import streamlit.components.v1 as components

st.set_page_config(
    page_title="Escanear Factura - MarangatuListo",
    page_icon="📱",
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

/* Header */
.top-header {
    background: white;
    padding: 1rem  2rem;
    border-radius: 15px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    margin-bottom: 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.user-info {
    color: #6B7280;
    font-size: 0.9rem;
}

.user-name {
    color: #7B2CBF;
    font-weight: 600;
}

/* Card principal */
.scan-card {
    background: white;
    padding: 2.5rem;
    border-radius: 20px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    margin: 2rem auto;
    max-width: 800px;
}

.scan-card h1 {
    color: #2D3748;
    font-size: 2rem;
    margin-bottom: 0.5rem;
    text-align: center;
}

.scan-card p {
    color: #6B7280;
    text-align: center;
    margin-bottom: 2rem;
}

/* Upload area */
.upload-area {
    border: 3px dashed #DDD;
    border-radius: 15px;
    padding: 3rem 2rem;
    text-align: center;
    transition: all 0.3s;
    cursor: pointer;
    background: #FAFAFA;
}

.upload-area:hover {
    border-color: #7B2CBF;
    background: #F5F3FF;
}

.upload-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
}

/* Popup de confirmação */
.confirmation-popup {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: fadeIn 0.3s;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.popup-content {
    background: white;
    padding: 2.5rem;
    border-radius: 20px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    animation: slideUp 0.3s;
}

@keyframes slideUp {
    from { transform: translateY(50px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

.popup-title {
    font-size: 1.8rem;
    color: #2D3748;
    margin-bottom: 1.5rem;
    text-align: center;
}

.data-item {
    background: #F8F9FA;
    padding: 1rem;
    border-radius: 10px;
    margin-bottom: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.data-label {
    color: #6B7280;
    font-weight: 500;
}

.data-value {
    color: #2D3748;
    font-weight: 600;
    font-size: 1.1rem;
}

.popup-buttons {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
}

.btn-confirm {
    flex: 1;
    background: linear-gradient(135deg, #7B2CBF 0%, #9D4EDD 100%);
    color: white;
    padding: 1rem;
    border-radius: 10px;
    border: none;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.3s, box-shadow 0.3s;
}

.btn-confirm:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(123, 44, 191, 0.4);
}

.btn-cancel {
    flex: 1;
    background: white;
    color: #7B2CBF;
    padding: 1rem;
    border-radius: 10px;
    border: 2px solid #7B2CBF;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
}

.btn-cancel:hover {
    background: #F5F3FF;
}

/* Success message */
.success-banner {
    background: linear-gradient(135deg, #10B981 0%, #059669 100%);
    color: white;
    padding: 1.5rem;
    border-radius: 15px;
    text-align: center;
    margin: 2rem 0;
    font-size: 1.2rem;
    font-weight: 600;
    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
}
</style>
""", unsafe_allow_html=True)

def mostrar_popup_confirmacion(datos):
    """Mostra popup de confirmação com os dados extraídos"""
    st.markdown(f"""
    <div class="confirmation-popup" id="popup">
        <div class="popup-content">
            <h2 class="popup-title">📋 Verificar Datos</h2>
            
            <div class="data-item">
                <span class="data-label">📅 Fecha:</span>
                <span class="data-value">{datos.get('fecha', 'No detectada')}</span>
            </div>
            
            <div class="data-item">
                <span class="data-label">🏪 Local:</span>
                <span class="data-value">{datos.get('local', 'No detectado')[:30]}</span>
            </div>
            
            <div class="data-item">
                <span class="data-label">💰 Valor:</span>
                <span class="data-value">Gs. {datos.get('valor', '0')}</span>
            </div>
            
            <div class="data-item">
                <span class="data-label">🏢 RUC Emisor:</span>
                <span class="data-value">{dados.get('ruc_emisor', 'No detectado')}</span>
            </div>
        </div>
    </div>
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
            <div>
                <h2 style="margin: 0; color: #7B2CBF;">📱 MarangatuListo</h2>
            </div>
            <div class="user-info">
                Bienvenido, <span class="user-name">{usuario.get('nombre', 'Usuario')}</span>
            </div>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        if st.button("🚪 Cerrar Sesión", use_container_width=True):
            cerrar_sesion()
            st.rerun()
    
    # Card principal
    st.markdown('<div class="scan-card">', unsafe_allow_html=True)
    st.markdown('<h1>📸 Escanear Factura</h1>', unsafe_allow_html=True)
    st.markdown('<p>Toma una foto o sube una imagen de tu factura</p>', unsafe_allow_html=True)
    
    # Tabs para Camera e Upload
    tab1, tab2 = st.tabs(["📷 Usar Cámara", "📁 Subir Archivo"])
    
    with tab1:
        st.info("💡 Asegúrate de que la factura esté bien iluminada y enfocada")
        camera_image = st.camera_input("Captura tu factura")
        
        if camera_image:
            processar_imagen(camera_image, usuario)
    
    with tab2:
        st.info("💡 Formatos soportados: JPG, JPEG, PNG")
        uploaded_file = st.file_uploader(
            "Arrastra y suelta o haz clic para seleccionar",
            type=['jpg', 'jpeg', 'png'],
            label_visibility="collapsed"
        )
        
        if uploaded_file:
            processar_imagen(uploaded_file, usuario)
    
    st.markdown('</div>', unsafe_allow_html=True)

def processar_imagen(image_file, usuario):
    """Processa la imagen y extrai datos"""
    try:
        # Mostrar preview
        st.image(image_file, caption="Vista previa de la factura", use_container_width=True)
        
        with st.spinner("🔍 Extrayendo datos de la factura..."):
            # Leer bytes da imagem
            image_bytes = image_file.getvalue()
            
            # Extrair dados diretamente com Gemini
            datos = ocr_service.extract_data_from_image(image_bytes)
            
            # Adicionar dados do usuário
            datos['user_id'] = usuario['id']
            datos['usuario_ruc'] = usuario['ruc']
            
            # Mostrar dados extraídos para edição
            st.success("✅ Datos extraídos con éxito!")
            
            st.markdown("### 📝 Verificar y Editar Datos")
            
            col1, col2 = st.columns(2)
            
            with col1:
                datos['fecha'] = st.text_input("📅 Fecha", value=datos.get('fecha', ''))
                datos['valor'] = st.text_input("💰 Valor (Gs.)", value=datos.get('valor', ''))
            
            with col2:
                datos['local'] = st.text_input("🏪 Local", value=datos.get('local', ''))
                datos['ruc_emisor'] = st.text_input("🏢 RUC Emisor", value=datos.get('ruc_emisor', ''))
            
            # Botões de ação
            col1, col2, col3 = st.columns([1, 2, 1])
            
            with col2:
                if st.button("✅ Confirmar y Guardar", type="primary", use_container_width=True):
                    guardar_factura(datos, image_bytes)
    
    except Exception as e:
        st.error(f"❌ Error al procesar la imagen: {str(e)}")

def guardar_factura(datos, image_bytes):
    """Guarda la factura en Supabase"""
    try:
        with st.spinner("💾 Guardando factura..."):
            supabase = get_supabase_client()
            
            # Upload da imagem
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            file_name  = f"factura_{datos['user_id']}_{timestamp}.jpg"
            
            # Storage upload (assumindo que você criou um bucket 'facturas')
            supabase.storage.from_('facturas').upload(
                file_name,
                image_bytes,
                file_options={"content-type": "image/jpeg"}
            )
            
            # Get public URL
            image_url = supabase.storage.from_('facturas').get_public_url(file_name)
            
            # Inserir no banco
            factura_data = {
                "user_id": datos['user_id'],
                "fecha_factura": datos.get('fecha'),
                "local": datos.get('local'),
                "valor": float(datos.get('valor', 0)),
                "ruc_emisor": datos.get('ruc_emisor'),
                "image_url": image_url,
                "confirmado": True
            }
            
            supabase.table('facturas').insert(factura_data).execute()
            
            st.markdown('<div class="success-banner">🎉 ¡Factura guardada con éxito!</div>', unsafe_allow_html=True)
            st.balloons()
            
            # Reset após 2 segundos
            import time
            time.sleep(2)
            st.rerun()
    
    except Exception as e:
        st.error(f"❌ Error al guardar: {str(e)}")

if __name__ == "__main__":
    main()
