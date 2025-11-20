# 📱 MarangatuListo - Gestión Inteligente de Facturas

![Logo MarangatuListo](/.gemini/antigravity/brain/ea7b72df-6a43-465f-a649-b4724fb1b190/marangatu_listo_logo_1763586950178.png)

Aplicación web en Streamlit para escanear y gestionar facturas paraguayas usando IA.

## 🚀 Características

- ✅ **Escaneo con IA**: Extracción automática de datos usando Google Gemini
- 📱 **Mobile-First**: Optimizado para uso en smartphones
- 🔐 **Autenticación Segura**: Login y registro con Supabase Auth
- 💾 **Almacenamiento en la Nube**: Supabase para datos e imágenes
- 📊 **Reportes y Estadísticas**: Visualiza tus gastos
- 🌐 **Idioma**: Interfaz en español paraguayo (castellano)

## 🛠️ Stack Tecnológico

- **Frontend**: Streamlit (Python)
- **IA**: Google Gemini 2.0 Flash
- **Backend/DB**: Supabase
- **Autenticación**: Supabase Auth
- **Almacenamiento**: Supabase Storage

## 📦 Instalación

### 1. Clonar el repositorio

```bash
cd marangatu-listo
```

### 2. Crear entorno virtual

```bash
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

### 3. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 4. Configurar variables de entorno

Copie `.env.example` para `.env` y complete las credenciales:

```bash
cp .env.example .env
```

Edite `.env`:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### 5. Configurar Supabase

#### Crear las tablas

Execute el siguiente SQL en el Supabase SQL Editor:

```sql
-- Tabla de usuarios
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nombre TEXT NOT NULL,
    ruc TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'usuario' CHECK (rol IN ('admin', 'usuario')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de facturas
CREATE TABLE facturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fecha_factura TEXT,
    local TEXT,
    valor DECIMAL(15,2),
    ruc_emisor TEXT,
    image_url TEXT,
    confirmado BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX idx_facturas_user_id ON facturas(user_id);
CREATE INDEX idx_facturas_created_at ON facturas(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para users
CREATE POLICY "Users can view their own data"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- Políticas RLS para facturas
CREATE POLICY "Users can view their own facturas"
    ON facturas FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own facturas"
    ON facturas FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own facturas"
    ON facturas FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own facturas"
    ON facturas FOR DELETE
    USING (auth.uid() = user_id);
```

#### Criar bucket de storage

1. Vá para Storage no Supabase Dashboard
2. Crie um novo bucket chamado `facturas`
3. Configure como **público**

### 6. Obter API Keys

#### Gemini API Key
1. Acesse [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Crie uma nova API key
3. Copie e cole no `.env`

#### Supabase Credentials
1. Acesse seu projeto no [Supabase Dashboard](https://app.supabase.com)
2. Vá em Settings → API
3. Copie:
   - **URL**: Project URL
   - **anon/public**: anon key

## 🚀 Executar

```bash
streamlit run app.py
```

A aplicação abrirá automaticamente em `http://localhost:8501`

## 📱 Uso

1. **Registro**: Crie uma cuenta con tu email, nombre y RUC
2. **Login**: Inicia sesión con tus credenciales
3. **Escanear**: Usa la cámara o sube una foto de tu factura
4. **Verificar**: Revisa y edita los datos extraídos
5. **Guardar**: Confirma para almacenar en la nube
6. **Consultar**: Ve tu historial en "Mis Facturas"

## 📊 Estructura del Proyecto

```
marangatu-listo/
├── .streamlit/
│   └── config.toml          # Tema personalizado
├── assets/
│   └── logo.svg
├── components/
│   └── auth.py              # Autenticación
├── services/
│   ├── supabase_client.py   # Cliente Supabase
│   └── ocr_service.py       # Gemini AI para OCR
├── pages/
│   ├── 1_📱_Escanear.py
│   ├── 2_📊_Mis_Facturas.py
│   └── 3_ℹ️_Sobre_Nosotros.py
├── app.py                   # Página de login
├── requirements.txt
└── .env
```

## 🎨 Design

- **Colores**: Roxo (#7B2CBF) e Laranja (#FF6B35)
- **Tipografía**: Poppins (Google Fonts)
- **Inspiración**: EcoApp, con diseño moderno y limpio

## 🔒 Seguridad

- Autenticación via Supabase Auth
- Row Level Security (RLS) habilitado
- HTTPS obligatorio en producción
- Variables de entorno para credenciales

## 🌐 Deploy

### Streamlit Cloud (Recomendado)

1. Haga push del código para GitHub
2. Conecte em [Streamlit Cloud](https://streamlit.io/cloud)
3. Configure las variables de entorno (Secrets)
4. Deploy!

### Otras opciones
- Heroku
- Railway
- Render
- AWS/Azure/GCP

## 🤝 Contribuir

1. Fork el proyecto
2. Cree una branch (`git checkout -b feature/amazing`)
3. Commit sus cambios (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing`)
5. Abra un Pull Request

## 📄 Licencia

MIT License - veja LICENSE para detalles

## 📧 Contacto

- Email: contacto@marangatu-listo.com
- GitHub: [MarangatuListo](https://github.com/marangatu-listo)

---

Hecho con ❤️ en Paraguay 🇵🇾
