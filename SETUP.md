# Guía de Configuración e Instalación - Docuvi

Esta guía te llevará paso a paso para configurar y ejecutar el sistema Docuvi en tu entorno local.

## 📋 Requisitos Previos

- Node.js 18.x o superior
- npm o yarn
- Cuenta en Supabase (gratuita)
- Editor de código (VS Code recomendado)

## 🚀 Paso 1: Clonar/Verificar el Proyecto

El proyecto ya está creado en:
```
C:\Users\Prekad7010\Documents\ProyectosVSC\Docuvi
```

## 📦 Paso 2: Instalar Dependencias

Las dependencias ya están instaladas (506 paquetes). Si necesitas reinstalar:

```bash
cd C:\Users\Prekad7010\Documents\ProyectosVSC\Docuvi
npm install
```

## 🔑 Paso 3: Configurar Variables de Entorno

1. Copia el archivo de ejemplo:
```bash
copy .env.example .env.local
```

2. Edita `.env.local` con tus credenciales:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### ¿Dónde obtener las credenciales de Supabase?

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea un nuevo proyecto (o usa uno existente)
3. Ve a Settings > API
4. Copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **NUNCA compartas esta clave**

## 🗄️ Paso 4: Configurar la Base de Datos

### 4.1 Ejecutar Scripts SQL

En tu proyecto de Supabase, ve a **SQL Editor** y ejecuta los siguientes scripts **en orden**:

#### 1. Schema (Tablas e Índices)
```bash
# Copia el contenido de: supabase/schema.sql
```
Pega y ejecuta en SQL Editor

#### 2. Functions (Funciones y Triggers)
```bash
# Copia el contenido de: supabase/functions.sql
```
Pega y ejecuta en SQL Editor

#### 3. Policies (Seguridad RLS)
```bash
# Copia el contenido de: supabase/policies.sql
```
Pega y ejecuta en SQL Editor

#### 4. Storage (Almacenamiento de Archivos)
```bash
# Copia el contenido de: supabase/storage.sql
```
Pega y ejecuta en SQL Editor

### 4.2 Crear Bucket de Storage

Si el bucket no se creó automáticamente:

1. Ve a **Storage** en Supabase
2. Click en "Create a new bucket"
3. Nombre: `documentos`
4. Public: **NO** (debe ser privado)
5. File size limit: `10485760` (10MB)
6. Allowed MIME types: `application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, image/jpeg, image/png`

### 4.3 Verificar Instalación

En SQL Editor, ejecuta:

```sql
-- Verificar que las tablas existen
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- Verificar que las políticas RLS están activas
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

Deberías ver 9 tablas y múltiples políticas.

## 👤 Paso 5: Crear Usuario Administrador

### Opción A: Desde Supabase UI

1. Ve a **Authentication** > **Users**
2. Click en "Add user" > "Create new user"
3. Completa:
   - Email: `admin@docuvi.com` (o el que prefieras)
   - Password: `admin123` (cambiarás esto después)
   - Confirm email: ✅ (marcar)

4. Ve a **SQL Editor** y ejecuta:

```sql
UPDATE public.usuarios
SET rol = 'revisor'
WHERE correo = 'admin@docuvi.com';
```

### Opción B: Desde SQL Editor

```sql
-- Insertar usuario en auth.users y public.usuarios automáticamente
INSERT INTO auth.users (
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'admin@docuvi.com',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  '{"nombre": "Administrador", "rol": "revisor"}'::jsonb
);
```

## 🎯 Paso 6: Ejecutar el Proyecto

```bash
npm run dev
```

El proyecto se ejecutará en: **http://localhost:3000**

## ✅ Paso 7: Probar el Sistema

### 7.1 Iniciar Sesión como Revisor

1. Abre http://localhost:3000
2. Te redirigirá a `/iniciar-sesion`
3. Usa:
   - Email: `admin@docuvi.com`
   - Password: `admin123`
4. Deberías ver el **Panel del Revisor**

### 7.2 Crear un Cliente

1. Ve a **Clientes** en el sidebar
2. Click en "Nuevo Cliente"
3. Completa el formulario:
   - Nombre: "Constructora ABC"
   - Correo: `cliente@test.com`
   - Teléfono: "555-1234"
   - ✅ Crear cuenta de usuario
   - Password: `cliente123`
4. Click en "Crear Cliente"

### 7.3 Crear Tipos de Documento

1. Ve a **Tipos de Documento**
2. Crea algunos tipos:
   - RFC
   - INE
   - Comprobante de Domicilio
   - Seguro de Responsabilidad Civil

### 7.4 Asignar Requerimientos

1. Ve a **Clientes**
2. Click en "Ver Detalle" del cliente creado
3. En la sección de requerimientos, asigna algunos tipos de documento
4. Marca algunos como obligatorios

### 7.5 Probar como Cliente

1. Abre una ventana de incógnito
2. Ve a http://localhost:3000
3. Inicia sesión como cliente:
   - Email: `cliente@test.com`
   - Password: `cliente123`
4. Verás el **Portal del Cliente**
5. Ve a **Mis Requerimientos**
6. Sube un documento de prueba (cualquier PDF o imagen)

### 7.6 Aprobar Documentos

1. Vuelve a la sesión del Revisor
2. Ve a **Revisión** (Bandeja de Revisión)
3. Verás el documento subido
4. Click en "Ver" para verlo
5. Click en "Aprobar"
6. Opcionalmente agrega fecha de vencimiento
7. Confirma

### 7.7 Generar Certificado

1. Como Revisor, ve a **Certificados**
2. Click en "Generar Certificado"
3. Selecciona el cliente
4. Indica fechas de vigencia
5. Click en "Generar"
6. Si el cliente cumple con todos los requisitos, se generará el certificado

### 7.8 Verificar Certificado

1. Copia el código del certificado (ej: `CERT-2025-123456`)
2. Abre http://localhost:3000/verificar/CERT-2025-123456
3. Verás la página de verificación pública
4. El certificado debería aparecer como válido

## 🔧 Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Ejecutar build
npm run start

# Verificar tipos TypeScript
npm run type-check

# Linter
npm run lint
```

## 📊 Estructura de Carpetas

```
Docuvi/
├── src/
│   ├── app/                 # Páginas Next.js (App Router)
│   │   ├── (auth)/         # Autenticación
│   │   ├── revisor/        # Dashboard Revisor
│   │   ├── cliente/        # Dashboard Cliente
│   │   ├── verificar/      # Verificación pública
│   │   └── api/            # API routes
│   ├── components/          # Componentes React
│   │   ├── base/           # Componentes reutilizables
│   │   └── layouts/        # Layouts
│   ├── contexts/           # Context providers
│   ├── lib/                # Utilidades
│   ├── services/           # Servicios API
│   ├── store/              # Zustand stores
│   └── types/              # Tipos TypeScript
├── supabase/               # Scripts SQL
└── public/                 # Assets estáticos
```

## ❓ Solución de Problemas

### Error: "SUPABASE_URL is not defined"

Verifica que el archivo `.env.local` existe y tiene las variables correctas.

### Error: "relation does not exist"

No se ejecutaron los scripts SQL. Ve al Paso 4 y ejecuta los scripts en orden.

### Error: "RLS policy violation"

Las políticas RLS no se aplicaron correctamente. Ejecuta `supabase/policies.sql` nuevamente.

### No puedo subir archivos

1. Verifica que el bucket `documentos` existe en Storage
2. Verifica que las políticas de storage se ejecutaron (`supabase/policies.sql`)
3. El bucket debe ser **privado**, no público

### El middleware redirige incorrectamente

Limpia las cookies del navegador y vuelve a iniciar sesión.

## 📚 Próximos Pasos

1. Personaliza los tipos de documento según tu negocio
2. Ajusta las validaciones de archivos si es necesario
3. Configura notificaciones por correo (opcional)
4. Despliega en producción (Vercel + Supabase)

## 🚀 Despliegue en Producción

### Vercel (Recomendado)

1. Sube el código a GitHub
2. Importa el proyecto en Vercel
3. Configura las variables de entorno
4. Despliega

### Variables de Entorno en Producción

Configura las mismas variables pero con los valores de producción de Supabase.

---

**¿Necesitas ayuda?** Revisa los archivos SQL en la carpeta `supabase/` o consulta la documentación de Supabase.
