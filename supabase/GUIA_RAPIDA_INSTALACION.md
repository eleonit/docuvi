# 🚀 Guía Rápida - Instalación de Certificados

## ¿Dónde estás ejecutando los scripts?

### 🌐 Opción A: Supabase Dashboard (SQL Editor Web)

**¿Estás usando el navegador web?** → Usa esta opción

#### Script a usar: `certificados_reinstall_web.sql` ⭐

**Pasos**:
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Navega a: **SQL Editor** → **New Query**
4. Copia y pega **TODO** el contenido de `certificados_reinstall_web.sql`
5. Haz clic en **RUN** (o presiona Cmd/Ctrl + Enter)
6. Espera a que termine (verás mensajes de progreso)
7. ¡Listo! ✅

**Características**:
- ✅ Funciona en el navegador
- ✅ No requiere instalación de herramientas
- ✅ Muestra mensajes de progreso
- ✅ Verificación automática incluida
- ❌ No puede ejecutar `\echo` o `\i`

---

### 💻 Opción B: Línea de Comandos (psql)

**¿Tienes psql instalado y prefieres la terminal?** → Usa esta opción

#### Script a usar: `certificados_reinstall.sql`

**Pasos**:
```bash
# 1. Navega a la carpeta de scripts
cd supabase

# 2. Ejecuta el script
psql -h db.xxxxxxxxxxxx.supabase.co \
     -p 5432 \
     -d postgres \
     -U postgres \
     -f certificados_reinstall.sql

# 3. Ingresa tu contraseña cuando se solicite

# 4. Verifica la instalación
psql -f certificados_test.sql
```

**Características**:
- ✅ Más potente y flexible
- ✅ Soporta `\echo`, `\i` y otros comandos
- ✅ Mejor para automatización
- ✅ Puede incluir múltiples archivos
- ❌ Requiere instalación de PostgreSQL/psql

---

## 📋 Tabla de Compatibilidad

| Script | Supabase Dashboard | psql CLI |
|--------|:------------------:|:--------:|
| `certificados_implementation.sql` | ✅ | ✅ |
| `certificados_reinstall_web.sql` | ✅ | ✅ |
| `certificados_reinstall.sql` | ❌ | ✅ |
| `certificados_rollback.sql` | ❌ | ✅ |
| `certificados_test.sql` | ❌ | ✅ |

**Leyenda**:
- ✅ = Funciona perfectamente
- ❌ = No funciona (errores de sintaxis con `\echo`, `\i`)

---

## ❓ ¿Qué Script Debo Usar?

### Primera vez instalando
```
Supabase Dashboard → certificados_implementation.sql
      o
psql CLI → certificados_implementation.sql
```

### Ya instalé antes y tengo errores (trigger already exists)
```
Supabase Dashboard → certificados_reinstall_web.sql ⭐
      o
psql CLI → certificados_reinstall.sql
```

### Quiero desinstalar completamente
```
psql CLI → certificados_rollback.sql
(No hay versión web, debe hacerse por CLI)
```

### Quiero verificar que todo está bien
```
psql CLI → certificados_test.sql
      o
Supabase Dashboard → Verificación manual (ver abajo)
```

---

## 🔍 Verificación Manual (Supabase Dashboard)

Si usaste Supabase Dashboard y quieres verificar manualmente:

```sql
-- 1. Verificar tablas
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('certificados', 'certificados_detalle');
-- Debe retornar 2 filas

-- 2. Verificar funciones
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%certificado%';
-- Debe retornar 6 funciones

-- 3. Verificar triggers
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table = 'certificados';
-- Debe retornar 3 triggers

-- 4. Verificar vistas
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public'
AND table_name LIKE '%certificado%';
-- Debe retornar 2 vistas
```

---

## 🆘 Errores Comunes

### Error: "syntax error at or near \\"

**Problema**: Estás usando un script CLI en Supabase Dashboard

**Solución**: Usa `certificados_reinstall_web.sql` en su lugar

---

### Error: "trigger already exists"

**Problema**: Ya ejecutaste el script antes

**Solución**:
```
Supabase Dashboard:
  → Usa certificados_reinstall_web.sql

psql CLI:
  → Usa certificados_reinstall.sql
```

---

### Error: "relation certificados does not exist"

**Problema**: El esquema base no está instalado

**Solución**:
1. Primero instala el esquema base: `schema.sql`
2. Luego instala funciones: `functions.sql`
3. Finalmente instala certificados

---

## ✅ Checklist de Instalación

- [ ] Identifiqué dónde voy a ejecutar (Dashboard o CLI)
- [ ] Seleccioné el script correcto según la tabla
- [ ] Si es primera vez → `certificados_implementation.sql`
- [ ] Si ya instalé antes → `certificados_reinstall_web.sql` (Dashboard)
- [ ] Ejecuté el script completo
- [ ] Verifiqué que no hubo errores
- [ ] Confirmé que las tablas existen
- [ ] El frontend puede generar PDFs

---

## 📞 Soporte

Si tienes problemas:

1. ✅ Verifica que estás usando el script correcto
2. ✅ Lee el mensaje de error completo
3. ✅ Consulta `SOLUCION_ERROR_TRIGGER.md`
4. ✅ Revisa `CERTIFICADOS_README.md`

---

**Última actualización**: 2025-01-01
