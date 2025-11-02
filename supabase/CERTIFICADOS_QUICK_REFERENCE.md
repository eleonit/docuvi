# Guía Rápida - Certificados de Cumplimiento

## 📦 Instalación Rápida

```bash
# 1. Ejecutar en Supabase SQL Editor
psql -f supabase/certificados_implementation.sql

# 2. Verificar instalación
psql -f supabase/certificados_test.sql
```

## 🔑 Funciones Principales

### Generar Código de Certificado
```sql
SELECT generar_codigo_certificado();
-- Resultado: 'CERT-2025-123456'
```

### Verificar Cumplimiento
```sql
SELECT * FROM verificar_cumplimiento_cliente('cliente-uuid');
-- Retorna: cumple, total_requerimientos, requerimientos_cumplidos, pendientes
```

### Actualizar Vencidos
```sql
SELECT actualizar_certificados_vencidos();
-- Retorna: cantidad de certificados actualizados
```

### Certificados Próximos a Vencer
```sql
SELECT * FROM obtener_certificados_proximos_vencer(30);
-- Certificados que vencen en 30 días
```

## 💾 Consultas Comunes

### Ver Todos los Certificados Activos
```sql
SELECT codigo, cliente_nombre, fecha_validez_hasta, dias_hasta_vencimiento
FROM vista_certificados_completos
WHERE es_valido = true
ORDER BY fecha_emision DESC;
```

### Certificados de un Cliente
```sql
SELECT *
FROM certificados
WHERE cliente_id = 'uuid-del-cliente'
ORDER BY fecha_emision DESC;
```

### Detalles de un Certificado
```sql
SELECT
  cd.*,
  d.nombre_archivo,
  d.url
FROM certificados_detalle cd
LEFT JOIN documentos d ON d.id = cd.documento_id
WHERE cd.certificado_id = 'uuid-del-certificado';
```

### Estadísticas Generales
```sql
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE estado = 'activo') as activos,
  COUNT(*) FILTER (WHERE estado = 'vencido') as vencidos,
  COUNT(*) FILTER (WHERE estado = 'revocado') as revocados
FROM certificados;
```

## ✏️ Operaciones CRUD

### Crear Certificado (vía servicio)
```typescript
import { generarCertificado } from '@/services/certificados.service'

const cert = await generarCertificado(
  clienteId,
  emisorId,
  '2025-01-01',
  '2026-01-01'
)
```

### Revocar Certificado
```sql
UPDATE certificados
SET
  estado = 'revocado',
  motivo_revocacion = 'Documentos desactualizados',
  revocado_por = 'revisor-uuid',
  revocado_en = NOW()
WHERE id = 'certificado-uuid';
```

### Verificar Certificado por Código
```sql
SELECT *
FROM vista_certificados_completos
WHERE codigo = 'CERT-2025-123456';
```

## 📊 Vistas Útiles

### `vista_certificados_clientes`
```sql
SELECT * FROM vista_certificados_clientes;
-- Resumen por cliente
```

### `vista_certificados_completos`
```sql
SELECT * FROM vista_certificados_completos
WHERE es_valido = true;
-- Toda la información del certificado
```

## 🔒 Políticas de Seguridad

| Rol | Certificados | Detalles |
|-----|-------------|----------|
| **Revisor** | Todo acceso | Todo acceso |
| **Cliente** | Solo propios | Solo propios |
| **Público** | Solo lectura (verificación) | Solo lectura |

## 🚨 Mantenimiento

### Tarea Diaria (Cron)
```sql
-- Actualizar certificados vencidos
SELECT cron.schedule(
  'actualizar-certificados-vencidos',
  '0 0 * * *',
  $$SELECT actualizar_certificados_vencidos()$$
);
```

### Alertas de Vencimiento
```sql
-- Enviar notificaciones para certificados que vencen pronto
SELECT
  c.cliente_id,
  cl.nombre_empresa,
  c.codigo,
  c.fecha_validez_hasta
FROM certificados c
JOIN clientes cl ON cl.id = c.cliente_id
WHERE c.estado = 'activo'
  AND c.fecha_validez_hasta BETWEEN CURRENT_DATE AND CURRENT_DATE + 30;
```

## 🐛 Troubleshooting

### Error: "no se encontró la función"
```sql
-- Reinstalar funciones
\i certificados_implementation.sql
```

### RLS bloquea acceso
```sql
-- Verificar rol del usuario
SELECT rol FROM usuarios WHERE id = auth.uid();

-- Ver políticas activas
SELECT * FROM pg_policies WHERE tablename = 'certificados';
```

### Certificados no se marcan como vencidos
```sql
-- Ejecutar manualmente
SELECT actualizar_certificados_vencidos();
```

## 📱 Integración Frontend

### Descargar PDF
```typescript
import { generarCertificadoPDF } from '@/lib/generarPDF'

const handleDescargar = async (certificadoId: string) => {
  const cert = await obtenerCertificadoPorId(certificadoId)
  await generarCertificadoPDF(cert)
}
```

### Verificar en Página Pública
```typescript
// Ruta: /verificar/[codigo]
const { codigo } = useParams()
const resultado = await verificarCertificado(codigo)
```

## 📈 Métricas Importantes

### KPIs del Sistema
```sql
SELECT
  -- Total de certificados emitidos
  COUNT(*) as total_emitidos,

  -- Certificados activos
  COUNT(*) FILTER (WHERE estado = 'activo') as activos,

  -- Tasa de revocación
  ROUND(
    COUNT(*) FILTER (WHERE estado = 'revocado')::numeric / COUNT(*) * 100,
    2
  ) as tasa_revocacion,

  -- Promedio de documentos por certificado
  ROUND(AVG(
    (SELECT COUNT(*) FROM certificados_detalle cd WHERE cd.certificado_id = c.id)
  ), 2) as promedio_documentos
FROM certificados c;
```

### Clientes con Más Certificados
```sql
SELECT
  nombre_empresa,
  total_certificados,
  certificados_activos
FROM vista_certificados_clientes
ORDER BY total_certificados DESC
LIMIT 10;
```

## 🔐 Verificación de Hash

```typescript
import { generarHash } from '@/lib/utils'

// Verificar autenticidad
const dataParaHash = JSON.stringify({
  codigo: cert.codigo,
  clienteId: cert.cliente_id,
  fechaValidezDesde: cert.fecha_validez_desde,
  fechaValidezHasta: cert.fecha_validez_hasta,
  detalles: cert.detalles
})

const hashCalculado = await generarHash(dataParaHash)
const esValido = hashCalculado === cert.hash
```

## 📋 Checklist de Implementación

- [x] Tablas creadas (`certificados`, `certificados_detalle`)
- [x] Índices optimizados
- [x] Funciones de negocio
- [x] Triggers de notificación
- [x] RLS habilitado
- [x] Vistas de consulta
- [x] Integración con frontend
- [x] Generación de PDF
- [x] Verificación pública
- [x] Sistema de notificaciones

## 🔗 Enlaces Útiles

- [Documentación Completa](./CERTIFICADOS_README.md)
- [Script de Instalación](./certificados_implementation.sql)
- [Script de Pruebas](./certificados_test.sql)
- [Código Frontend](../src/lib/generarPDF.ts)
- [Servicio](../src/services/certificados.service.ts)

---

**Última actualización**: 2025-01-01
