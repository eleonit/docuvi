# Docuvi - Sistema de Gestión Documental

Sistema de control y gestión de documentos para contratistas y proveedores, construido con Next.js 15 y Supabase.

## Características principales

- **Gestión de clientes y contratistas**
- **Control de documentos** con flujo de aprobación
- **Certificados de cumplimiento** con código QR
- **Notificaciones en tiempo real**
- **Auditoría completa** de acciones
- **Roles diferenciados**: Revisor y Cliente
- **Gestión de vencimientos** de documentos
- **Almacenamiento seguro** con Supabase Storage

## Tecnologías

- **Next.js 15** (App Router)
- **TypeScript**
- **Supabase** (PostgreSQL + Auth + Storage + Realtime)
- **TailwindCSS**
- **TanStack Query** (React Query)
- **Zustand** (State Management)
- **jsPDF** (Generación de PDFs)

## Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copiar `.env.example` a `.env.local` y completar:

```bash
NEXT_PUBLIC_SUPABASE_URL=tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Configurar base de datos

Ejecutar los scripts SQL en Supabase:

1. `supabase/schema.sql` - Esquema principal
2. `supabase/policies.sql` - Políticas de seguridad RLS
3. `supabase/functions.sql` - Funciones y triggers

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## Estructura del proyecto

```
src/
├── app/                    # Páginas Next.js (App Router)
│   ├── (auth)/            # Rutas de autenticación
│   ├── cliente/           # Dashboard del cliente
│   ├── revisor/           # Dashboard del revisor
│   └── api/               # API routes
├── components/            # Componentes React
│   ├── base/             # Componentes reutilizables
│   └── ...               # Componentes específicos
├── lib/                   # Configuraciones
│   ├── supabase.ts       # Cliente Supabase
│   └── utils.ts          # Utilidades
├── hooks/                 # Custom hooks
├── services/              # Capa de servicios API
├── store/                 # Estado global (Zustand)
└── types/                 # Tipos TypeScript
```

## Scripts disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build de producción
- `npm run start` - Iniciar servidor de producción
- `npm run lint` - Linter ESLint
- `npm run type-check` - Verificar tipos TypeScript

## Roles y permisos

### Revisor (Administrador)
- Gestionar clientes y usuarios
- Aprobar/rechazar documentos
- Generar certificados de cumplimiento
- Ver auditoría completa
- Gestionar tipos de documentos

### Cliente
- Ver requerimientos asignados
- Cargar documentos
- Ver estado de aprobación
- Descargar certificados

## Licencia

Privado - Todos los derechos reservados
