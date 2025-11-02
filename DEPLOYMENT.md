# Guía de Despliegue en Vercel

## Resumen

El código está listo para desplegarse en Vercel. Todos los errores de TypeScript y build han sido corregidos. Solo necesitas configurar las variables de entorno.

## Variables de Entorno Requeridas

Antes de desplegar, debes configurar las siguientes variables de entorno en Vercel:

### 1. NEXT_PUBLIC_SUPABASE_URL
- **Valor**: Tu URL de proyecto de Supabase
- **Ejemplo**: `https://tuproyecto.supabase.co`
- **Dónde encontrarlo**: Supabase Dashboard > Settings > API > Project URL

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Valor**: Tu clave pública (anon key) de Supabase
- **Dónde encontrarlo**: Supabase Dashboard > Settings > API > anon/public key
- **Nota**: Es seguro exponer esta clave en el cliente

### 3. SUPABASE_SERVICE_ROLE_KEY
- **Valor**: Tu clave de servicio (service role key) de Supabase
- **Dónde encontrarlo**: Supabase Dashboard > Settings > API > service_role key
- **⚠️ IMPORTANTE**: Esta clave debe mantenerse secreta. Solo se usa en el servidor.

### 4. NEXT_PUBLIC_APP_URL
- **Valor**: La URL de tu aplicación desplegada
- **Ejemplo**: `https://docuvi.vercel.app`
- **Nota**: Puedes usar el dominio que Vercel te asigne automáticamente

## Pasos para Configurar Variables en Vercel

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Haz clic en tu proyecto **Docuvi**
3. Ve a **Settings** (pestaña superior)
4. En el menú lateral, selecciona **Environment Variables**
5. Para cada variable:
   - Haz clic en **Add New**
   - **Name**: Ingresa el nombre de la variable (ej: `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value**: Ingresa el valor correspondiente
   - **Environment**: Selecciona todas las opciones (Production, Preview, Development)
   - Haz clic en **Save**
6. Repite para las 4 variables

## Después de Configurar las Variables

Una vez configuradas las variables de entorno:

1. Ve a **Deployments** en tu proyecto de Vercel
2. Encuentra el último deployment (el que falló)
3. Haz clic en los tres puntos (...) al lado derecho
4. Selecciona **Redeploy**
5. Confirma el redespliegue

El build debería completarse exitosamente en aproximadamente 2-3 minutos.

## Verificar el Despliegue

Una vez completado el despliegue:

1. Accede a tu URL de Vercel
2. Verifica que puedas acceder a `/iniciar-sesion`
3. Prueba la verificación pública de certificados en `/verificar/[codigo]`
4. Verifica que el middleware esté funcionando correctamente

## Problemas Comunes

### Error: "SUPABASE_SERVICE_ROLE_KEY no está definida"
- **Causa**: La variable de entorno no está configurada en Vercel
- **Solución**: Sigue los pasos anteriores para agregar la variable

### Error: "Cannot read property 'certificado' of undefined"
- **Causa**: Este error ya está corregido en el commit `5e69a76`
- **Solución**: Asegúrate de que Vercel esté desplegando el commit más reciente

### Error: "useSearchParams() should be wrapped in a suspense boundary"
- **Causa**: Este error ya está corregido en el commit `5e69a76`
- **Solución**: Asegúrate de que Vercel esté desplegando el commit más reciente

## Arquitectura de Deployment

- **Hosting**: Vercel (Next.js 15.5.6 con App Router)
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Almacenamiento**: Supabase Storage
- **Edge Runtime**: Middleware para protección de rutas

## Correcciones Aplicadas

Las siguientes correcciones ya están aplicadas en el código:

✅ Error de TypeScript en página de verificación (undefined check)
✅ Warning de React Hook en AuthContext (dependencias)
✅ Error de Suspense boundary en página de login
✅ Build pasa localmente sin errores
✅ Linting pasa sin errores críticos

## Próximos Pasos Opcionales

1. **Dominio personalizado**: Configura un dominio personalizado en Vercel Settings > Domains
2. **Analytics**: Habilita Vercel Analytics para monitorear el rendimiento
3. **CI/CD**: Los deploys automáticos ya están configurados con GitHub
4. **Backups**: Configura backups automáticos en Supabase

## Soporte

Si encuentras algún problema durante el despliegue, verifica:

1. Los logs de build en Vercel
2. Los logs de runtime en Vercel > Deployments > [tu deployment] > Logs
3. La consola del navegador para errores del cliente
4. Los logs de Supabase para problemas de base de datos
