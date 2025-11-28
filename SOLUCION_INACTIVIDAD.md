# Solución al Problema de Inactividad y Reconexión

## Problema Original

El sistema experimentaba problemas cuando el usuario permanecía inactivo por un periodo prolongado:

- La página tardaba mucho en cargar después de inactividad
- No se conectaba a la base de datos de forma inmediata
- Era necesario reiniciar, borrar caché o volver a ingresar al dominio
- No había advertencia antes de que la sesión expirara

## Solución Implementada

Se implementó una solución integral que incluye:

### 1. Sistema de Detección de Inactividad

**Archivo:** `src/hooks/useInactivityDetector.ts`

- Detecta cuando el usuario no ha interactuado con la aplicación
- Tiempo de inactividad: 25 minutos antes de mostrar advertencia
- Tiempo adicional: 5 minutos después de la advertencia para cerrar sesión
- Detecta eventos de actividad: clicks, movimiento del mouse, scroll, teclado, etc.

**Características:**
- Advertencia configurable (por defecto 25 minutos)
- Tiempo adicional antes del cierre automático (por defecto 5 minutos)
- Se puede cancelar fácilmente con cualquier acción del usuario

### 2. Modal de Advertencia de Inactividad

**Archivo:** `src/components/auth/InactivityWarningModal.tsx`

- Modal visual que alerta al usuario cuando está próximo a ser desconectado
- Muestra un countdown en tiempo real
- Opciones claras:
  - **Continuar Sesión:** Refresca la sesión y continúa trabajando
  - **Cerrar Sesión Ahora:** Cierra la sesión inmediatamente
- Barra de progreso visual
- Diseño responsivo y accesible

### 3. Refresco Automático de Tokens Mejorado

**Archivo:** `src/contexts/AuthContext.tsx`

**Mejoras implementadas:**

#### 3.1. Refresco Periódico Inteligente
- Se ejecuta cada 3 minutos (antes era 5 minutos)
- Verifica si el token está próximo a expirar (menos de 5 minutos)
- Solo refresca cuando es necesario, optimizando recursos

#### 3.2. Detección de Regreso a la Pestaña
- Detecta cuando el usuario regresa después de inactividad
- Verifica la validez de la sesión automáticamente
- Si la sesión expiró, cierra sesión automáticamente
- Si la sesión es válida, la refresca para extender su duración

#### 3.3. Manejo de Eventos de Autenticación
- Escucha eventos de Supabase (`TOKEN_REFRESHED`, `SIGNED_OUT`)
- Limpia el estado inmediatamente al cerrar sesión
- Maneja errores de autenticación de forma elegante

### 4. Manejo Mejorado de Errores de Conexión

**Archivo:** `src/contexts/Providers.tsx`

**Configuración del QueryClient mejorada:**

- **Refresco automático:**
  - `refetchOnWindowFocus: true` - Refresca al volver a la pestaña
  - `refetchOnReconnect: true` - Refresca al reconectar a internet

- **Reintentos inteligentes:**
  - No reintenta en errores de autenticación (401, JWT expirado)
  - Reintenta hasta 2 veces para otros errores
  - Delay exponencial entre reintentos (1s, 2s, 4s)

- **Timeout y modo de red:**
  - `networkMode: 'online'` - Solo ejecuta queries cuando hay conexión
  - Previene queries bloqueadas

### 5. Hook de Manejo de Errores de Autenticación

**Archivo:** `src/hooks/useAuthErrorHandler.ts`

- Detecta automáticamente errores de autenticación
- Muestra mensaje de error al usuario
- Cierra sesión automáticamente cuando el token expira
- Redirige a la página de inicio de sesión

## Flujo de Funcionamiento

### Escenario 1: Usuario Inactivo

1. **0-25 minutos:** Usuario inactivo, sesión se mantiene activa
2. **25 minutos:** Se muestra modal de advertencia
3. **Usuario actúa:**
   - Si hace click en "Continuar Sesión": Se refresca el token y continúa
   - Si hace click en "Cerrar Sesión": Se cierra inmediatamente
   - Si no hace nada: Después de 5 minutos se cierra automáticamente

### Escenario 2: Usuario Regresa Después de Inactividad

1. Usuario regresa a la pestaña después de estar inactivo
2. Sistema verifica automáticamente la validez de la sesión
3. **Si la sesión es válida:**
   - Se refresca automáticamente
   - Usuario continúa trabajando sin interrupciones
4. **Si la sesión expiró:**
   - Se cierra sesión automáticamente
   - Se redirige a la página de inicio de sesión
   - Se muestra mensaje explicativo

### Escenario 3: Error de Conexión Durante Query

1. Usuario intenta cargar datos (ej: lista de clientes)
2. **Si hay error de red:**
   - Se reintenta automáticamente (hasta 2 veces)
   - Delay incremental entre reintentos
3. **Si es error de autenticación:**
   - No reintenta
   - Muestra mensaje de error
   - Cierra sesión y redirige a login

## Configuración

### Tiempos de Inactividad (Ajustables)

```typescript
// En AuthContext.tsx, líneas 242-244
const { showWarning, cancelWarning } = useInactivityDetector({
  warningTimeout: 25 * 60 * 1000,  // 25 minutos (ajustable)
  logoutTimeout: 5 * 60 * 1000,     // 5 minutos adicionales (ajustable)
  // ...
})
```

### Intervalo de Refresco de Token

```typescript
// En AuthContext.tsx, línea 129
}, 3 * 60 * 1000) // 3 minutos (ajustable)
```

### Reintentos de Queries

```typescript
// En Providers.tsx, línea 36
return failureCount < 2  // Máximo 2 reintentos (ajustable)
```

## Beneficios de la Solución

### 1. Experiencia de Usuario Mejorada
- ✅ Advertencia antes de perder la sesión
- ✅ Reconexión automática al regresar
- ✅ Mensajes claros de lo que está sucediendo
- ✅ Sin pérdida de trabajo inesperada

### 2. Seguridad
- ✅ Cierre automático de sesión por inactividad
- ✅ Verificación constante de la validez del token
- ✅ Limpieza completa de sesión al cerrar

### 3. Confiabilidad
- ✅ Manejo robusto de errores de red
- ✅ Reintentos automáticos inteligentes
- ✅ Timeouts para prevenir bloqueos
- ✅ Logs detallados para debugging

### 4. Rendimiento
- ✅ Refresco solo cuando es necesario
- ✅ Queries optimizadas con caché
- ✅ Refresco al volver a la pestaña
- ✅ Detección inteligente de actividad

## Testing

### Para Probar la Funcionalidad

1. **Probar Modal de Inactividad:**
   - Iniciar sesión
   - No interactuar con la aplicación por 25 minutos
   - Verificar que aparezca el modal de advertencia
   - Probar ambos botones del modal

2. **Probar Reconexión al Regresar:**
   - Iniciar sesión
   - Minimizar el navegador por 10+ minutos
   - Volver a la pestaña
   - Verificar que se refresque automáticamente

3. **Probar Sesión Expirada:**
   - Iniciar sesión
   - Dejar la pestaña inactiva por más de 1 hora
   - Volver a la pestaña
   - Verificar que se cierre sesión automáticamente

## Archivos Modificados/Creados

### Archivos Nuevos
- `src/hooks/useInactivityDetector.ts`
- `src/components/auth/InactivityWarningModal.tsx`
- `src/hooks/useAuthErrorHandler.ts`
- `SOLUCION_INACTIVIDAD.md` (este archivo)

### Archivos Modificados
- `src/contexts/AuthContext.tsx`
  - Agregado detector de inactividad
  - Mejorado refresco automático de tokens
  - Mejorada detección de regreso a pestaña

- `src/contexts/Providers.tsx`
  - Mejorada configuración de QueryClient
  - Agregados reintentos inteligentes
  - Agregado manejo de errores de autenticación

## Notas Técnicas

### Compatibilidad
- ✅ Compatible con Next.js 15.5.6
- ✅ Compatible con Supabase Auth
- ✅ Compatible con TanStack Query (React Query)
- ✅ Responsive (móvil, tablet, desktop)

### Dependencias
- No se agregaron nuevas dependencias externas
- Utiliza solo las librerías ya instaladas en el proyecto

### Consideraciones de Seguridad
- Los tokens nunca se almacenan en variables globales
- Limpieza completa de localStorage al cerrar sesión
- Verificación de expiración antes de cada operación sensible
- Manejo seguro de timeouts y errores

## Mantenimiento Futuro

### Monitoreo Recomendado
- Revisar logs de consola para errores de refresco
- Monitorear tasas de cierre de sesión por inactividad
- Revisar feedback de usuarios sobre tiempos de inactividad

### Ajustes Posibles
- Ajustar tiempos de inactividad según feedback de usuarios
- Personalizar tiempos por tipo de usuario (revisor vs cliente)
- Agregar persistencia de preferencias de usuario

---

**Fecha de Implementación:** 28 de Noviembre, 2025
**Versión:** 1.0.0
