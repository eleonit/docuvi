-- =====================================================
-- DOCUVI - DATOS DE PRUEBA (IDEMPOTENTE)
-- Script opcional para poblar la base de datos con datos de ejemplo
-- =====================================================
-- Este script es solo para desarrollo/pruebas
-- NO ejecutar en producción
--
-- ✅ Este script es IDEMPOTENTE - puedes ejecutarlo múltiples veces
-- sin generar errores por duplicados
-- =====================================================

-- ⚠️ IMPORTANTE: Este script requiere que exista al menos un usuario revisor
-- Créalo usando create_revisor.sql o desde Supabase UI primero

DO $$
DECLARE
  revisor_id UUID;
  cliente1_id UUID;
  cliente2_id UUID;
  cliente3_id UUID;
  tipo_rfc_id UUID;
  tipo_ine_id UUID;
  tipo_curp_id UUID;
  tipo_domicilio_id UUID;
  tipo_acta_id UUID;
  tipo_constancia_id UUID;
  req1_id UUID;
  req2_id UUID;
  req3_id UUID;
BEGIN
  -- =====================================================
  -- Obtener ID del revisor
  -- =====================================================
  -- Ajusta el email según el revisor que creaste
  SELECT id INTO revisor_id
  FROM public.usuarios
  WHERE rol = 'revisor'
  LIMIT 1;

  IF revisor_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró ningún usuario revisor. Crea uno primero.';
  END IF;

  RAISE NOTICE 'Usando revisor ID: %', revisor_id;

  -- =====================================================
  -- Tipos de Documento
  -- =====================================================

  -- Insertar o actualizar tipos de documento (idempotente)
  INSERT INTO public.tipos_documento (nombre, descripcion, creado_por, activo)
  VALUES
    ('RFC', 'Registro Federal de Contribuyentes', revisor_id, true),
    ('INE/IFE', 'Identificación Oficial', revisor_id, true),
    ('CURP', 'Clave Única de Registro de Población', revisor_id, true),
    ('Comprobante de Domicilio', 'Recibo de luz, agua o teléfono no mayor a 3 meses', revisor_id, true),
    ('Acta Constitutiva', 'Documento de constitución de la empresa', revisor_id, true),
    ('Constancia de Situación Fiscal', 'Constancia emitida por el SAT', revisor_id, true),
    ('IMSS Afiliación', 'Comprobante de alta patronal ante el IMSS', revisor_id, true),
    ('Póliza de Seguro', 'Póliza de seguro de responsabilidad civil', revisor_id, true),
    ('Licencia Municipal', 'Licencia de funcionamiento municipal', revisor_id, true),
    ('Opinión Cumplimiento SAT', 'Opinión de cumplimiento de obligaciones fiscales', revisor_id, true)
  ON CONFLICT (nombre) DO UPDATE
  SET descripcion = EXCLUDED.descripcion,
      activo = EXCLUDED.activo;

  -- Obtener IDs de los tipos creados (con LIMIT 1 por seguridad)
  SELECT id INTO tipo_rfc_id FROM public.tipos_documento WHERE nombre = 'RFC' LIMIT 1;
  SELECT id INTO tipo_ine_id FROM public.tipos_documento WHERE nombre = 'INE/IFE' LIMIT 1;
  SELECT id INTO tipo_curp_id FROM public.tipos_documento WHERE nombre = 'CURP' LIMIT 1;
  SELECT id INTO tipo_domicilio_id FROM public.tipos_documento WHERE nombre = 'Comprobante de Domicilio' LIMIT 1;
  SELECT id INTO tipo_acta_id FROM public.tipos_documento WHERE nombre = 'Acta Constitutiva' LIMIT 1;
  SELECT id INTO tipo_constancia_id FROM public.tipos_documento WHERE nombre = 'Constancia de Situación Fiscal' LIMIT 1;

  RAISE NOTICE 'Tipos de documento creados';

  -- =====================================================
  -- Clientes
  -- =====================================================

  -- Cliente 1: Constructora ABC (verificar si ya existe)
  SELECT id INTO cliente1_id
  FROM public.clientes
  WHERE correo_contacto = 'contacto@constructoraabc.com'
  LIMIT 1;

  IF cliente1_id IS NULL THEN
    INSERT INTO public.clientes (nombre_empresa, correo_contacto, telefono_contacto, creado_por)
    VALUES (
      'Constructora ABC S.A. de C.V.',
      'contacto@constructoraabc.com',
      '555-1234-001',
      revisor_id
    )
    RETURNING id INTO cliente1_id;
    RAISE NOTICE 'Cliente 1 creado: Constructora ABC';
  ELSE
    RAISE NOTICE 'Cliente 1 ya existe: Constructora ABC';
  END IF;

  -- Cliente 2: Servicios XYZ
  SELECT id INTO cliente2_id
  FROM public.clientes
  WHERE correo_contacto = 'admin@serviciosxyz.com'
  LIMIT 1;

  IF cliente2_id IS NULL THEN
    INSERT INTO public.clientes (nombre_empresa, correo_contacto, telefono_contacto, creado_por)
    VALUES (
      'Servicios XYZ S.A.',
      'admin@serviciosxyz.com',
      '555-1234-002',
      revisor_id
    )
    RETURNING id INTO cliente2_id;
    RAISE NOTICE 'Cliente 2 creado: Servicios XYZ';
  ELSE
    RAISE NOTICE 'Cliente 2 ya existe: Servicios XYZ';
  END IF;

  -- Cliente 3: Tecnología DEF
  SELECT id INTO cliente3_id
  FROM public.clientes
  WHERE correo_contacto = 'info@tecnologiadef.com'
  LIMIT 1;

  IF cliente3_id IS NULL THEN
    INSERT INTO public.clientes (nombre_empresa, correo_contacto, telefono_contacto, creado_por)
    VALUES (
      'Tecnología DEF S. de R.L.',
      'info@tecnologiadef.com',
      '555-1234-003',
      revisor_id
    )
    RETURNING id INTO cliente3_id;
    RAISE NOTICE 'Cliente 3 creado: Tecnología DEF';
  ELSE
    RAISE NOTICE 'Cliente 3 ya existe: Tecnología DEF';
  END IF;

  RAISE NOTICE 'Clientes creados';

  -- =====================================================
  -- Requerimientos para Cliente 1 (Constructora ABC)
  -- =====================================================

  INSERT INTO public.requerimientos_cliente (cliente_id, tipo_documento_id, obligatorio, periodicidad_meses)
  VALUES
    (cliente1_id, tipo_rfc_id, true, NULL),
    (cliente1_id, tipo_ine_id, true, NULL),
    (cliente1_id, tipo_acta_id, true, NULL),
    (cliente1_id, tipo_constancia_id, true, 12),
    (cliente1_id, tipo_domicilio_id, true, 3)
  ON CONFLICT (cliente_id, tipo_documento_id) DO UPDATE
  SET obligatorio = EXCLUDED.obligatorio,
      periodicidad_meses = EXCLUDED.periodicidad_meses;

  -- Obtener un requerimiento de ejemplo para Cliente 1
  SELECT id INTO req1_id
  FROM public.requerimientos_cliente
  WHERE cliente_id = cliente1_id
  LIMIT 1;

  -- =====================================================
  -- Requerimientos para Cliente 2 (Servicios XYZ)
  -- =====================================================

  INSERT INTO public.requerimientos_cliente (cliente_id, tipo_documento_id, obligatorio, periodicidad_meses)
  VALUES
    (cliente2_id, tipo_rfc_id, true, NULL),
    (cliente2_id, tipo_ine_id, true, NULL),
    (cliente2_id, tipo_curp_id, false, NULL),
    (cliente2_id, tipo_constancia_id, true, 12)
  ON CONFLICT (cliente_id, tipo_documento_id) DO UPDATE
  SET obligatorio = EXCLUDED.obligatorio,
      periodicidad_meses = EXCLUDED.periodicidad_meses;

  -- Obtener un requerimiento de ejemplo para Cliente 2
  SELECT id INTO req2_id
  FROM public.requerimientos_cliente
  WHERE cliente_id = cliente2_id AND tipo_documento_id = tipo_rfc_id
  LIMIT 1;

  -- =====================================================
  -- Requerimientos para Cliente 3 (Tecnología DEF)
  -- =====================================================

  INSERT INTO public.requerimientos_cliente (cliente_id, tipo_documento_id, obligatorio, periodicidad_meses)
  VALUES
    (cliente3_id, tipo_rfc_id, true, NULL),
    (cliente3_id, tipo_ine_id, true, NULL),
    (cliente3_id, tipo_acta_id, true, NULL)
  ON CONFLICT (cliente_id, tipo_documento_id) DO UPDATE
  SET obligatorio = EXCLUDED.obligatorio,
      periodicidad_meses = EXCLUDED.periodicidad_meses;

  -- Obtener un requerimiento de ejemplo para Cliente 3
  SELECT id INTO req3_id
  FROM public.requerimientos_cliente
  WHERE cliente_id = cliente3_id AND tipo_documento_id = tipo_ine_id
  LIMIT 1;

  RAISE NOTICE 'Requerimientos creados';

  -- =====================================================
  -- Documentos de ejemplo (simulados)
  -- =====================================================
  -- Nota: Estos documentos tienen URLs ficticias
  -- En producción, los documentos se suben a través de la app

  -- Documento aprobado para Cliente 1 - RFC
  INSERT INTO public.documentos (
    requerimiento_cliente_id,
    url,
    nombre_archivo,
    version,
    estado,
    fecha_carga,
    fecha_vencimiento,
    aprobado_por,
    fecha_aprobacion
  )
  SELECT
    rc.id,
    'clientes/' || cliente1_id || '/' || tipo_rfc_id || '/v1/rfc.pdf',
    'RFC_Constructora_ABC.pdf',
    1,
    'aprobado',
    NOW() - INTERVAL '30 days',
    NULL,
    revisor_id,
    NOW() - INTERVAL '25 days'
  FROM public.requerimientos_cliente rc
  WHERE rc.cliente_id = cliente1_id AND rc.tipo_documento_id = tipo_rfc_id
    AND NOT EXISTS (
      SELECT 1 FROM public.documentos d
      WHERE d.requerimiento_cliente_id = rc.id
        AND d.nombre_archivo = 'RFC_Constructora_ABC.pdf'
    );

  -- Documento aprobado para Cliente 1 - INE
  INSERT INTO public.documentos (
    requerimiento_cliente_id,
    url,
    nombre_archivo,
    version,
    estado,
    fecha_carga,
    fecha_vencimiento,
    aprobado_por,
    fecha_aprobacion
  )
  SELECT
    rc.id,
    'clientes/' || cliente1_id || '/' || tipo_ine_id || '/v1/ine.pdf',
    'INE_Representante.pdf',
    1,
    'aprobado',
    NOW() - INTERVAL '28 days',
    CURRENT_DATE + INTERVAL '2 years',
    revisor_id,
    NOW() - INTERVAL '26 days'
  FROM public.requerimientos_cliente rc
  WHERE rc.cliente_id = cliente1_id AND rc.tipo_documento_id = tipo_ine_id
    AND NOT EXISTS (
      SELECT 1 FROM public.documentos d
      WHERE d.requerimiento_cliente_id = rc.id
        AND d.nombre_archivo = 'INE_Representante.pdf'
    );

  -- Documento pendiente para Cliente 2
  INSERT INTO public.documentos (
    requerimiento_cliente_id,
    url,
    nombre_archivo,
    version,
    estado,
    fecha_carga
  )
  SELECT
    rc.id,
    'clientes/' || cliente2_id || '/' || tipo_rfc_id || '/v1/rfc.pdf',
    'RFC_Servicios_XYZ.pdf',
    1,
    'pendiente',
    NOW() - INTERVAL '2 days'
  FROM public.requerimientos_cliente rc
  WHERE rc.cliente_id = cliente2_id AND rc.tipo_documento_id = tipo_rfc_id
    AND NOT EXISTS (
      SELECT 1 FROM public.documentos d
      WHERE d.requerimiento_cliente_id = rc.id
        AND d.nombre_archivo = 'RFC_Servicios_XYZ.pdf'
    );

  -- Documento rechazado para Cliente 3
  INSERT INTO public.documentos (
    requerimiento_cliente_id,
    url,
    nombre_archivo,
    version,
    estado,
    fecha_carga,
    motivo_rechazo
  )
  SELECT
    rc.id,
    'clientes/' || cliente3_id || '/' || tipo_ine_id || '/v1/ine.pdf',
    'INE_Ilegible.pdf',
    1,
    'rechazado',
    NOW() - INTERVAL '5 days',
    'Documento ilegible. Por favor suba una copia más clara.'
  FROM public.requerimientos_cliente rc
  WHERE rc.cliente_id = cliente3_id AND rc.tipo_documento_id = tipo_ine_id
    AND NOT EXISTS (
      SELECT 1 FROM public.documentos d
      WHERE d.requerimiento_cliente_id = rc.id
        AND d.nombre_archivo = 'INE_Ilegible.pdf'
    );

  RAISE NOTICE 'Documentos de ejemplo creados';

  -- =====================================================
  -- Notificaciones de ejemplo
  -- =====================================================

  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, leida, datos)
  VALUES
    (
      revisor_id,
      'documento_nuevo',
      'Nuevo documento pendiente',
      'Servicios XYZ ha subido un nuevo documento para revisión',
      false,
      '{"cliente": "Servicios XYZ S.A."}'::jsonb
    ),
    (
      revisor_id,
      'info',
      'Sistema iniciado',
      'El sistema Docuvi ha sido configurado correctamente',
      true,
      '{}'::jsonb
    );

  RAISE NOTICE 'Notificaciones creadas';

  -- =====================================================
  -- Auditoría de ejemplo
  -- =====================================================

  INSERT INTO public.auditoria (actor_id, accion, entidad, entidad_id, datos)
  VALUES
    (
      revisor_id,
      'CREAR',
      'cliente',
      cliente1_id,
      jsonb_build_object('nombre_empresa', 'Constructora ABC S.A. de C.V.')
    ),
    (
      revisor_id,
      'CREAR',
      'cliente',
      cliente2_id,
      jsonb_build_object('nombre_empresa', 'Servicios XYZ S.A.')
    ),
    (
      revisor_id,
      'APROBAR_DOCUMENTO',
      'documento',
      NULL,
      jsonb_build_object('cliente', 'Constructora ABC', 'tipo', 'RFC')
    );

  RAISE NOTICE 'Registros de auditoría creados';

  -- =====================================================
  -- Resumen
  -- =====================================================

  RAISE NOTICE '========================================';
  RAISE NOTICE 'DATOS DE PRUEBA CREADOS EXITOSAMENTE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tipos de documento: 10';
  RAISE NOTICE 'Clientes: 3';
  RAISE NOTICE '  - Constructora ABC (ID: %)', cliente1_id;
  RAISE NOTICE '  - Servicios XYZ (ID: %)', cliente2_id;
  RAISE NOTICE '  - Tecnología DEF (ID: %)', cliente3_id;
  RAISE NOTICE 'Requerimientos: 12';
  RAISE NOTICE 'Documentos de ejemplo: 4';
  RAISE NOTICE '========================================';

END $$;

-- =====================================================
-- Verificar datos creados
-- =====================================================

-- Ver tipos de documento
SELECT
  nombre,
  descripcion,
  activo
FROM public.tipos_documento
ORDER BY nombre;

-- Ver clientes con requerimientos
SELECT
  c.nombre_empresa,
  COUNT(DISTINCT rc.id) as total_requerimientos,
  COUNT(DISTINCT CASE WHEN rc.obligatorio THEN rc.id END) as obligatorios
FROM public.clientes c
LEFT JOIN public.requerimientos_cliente rc ON rc.cliente_id = c.id
GROUP BY c.id, c.nombre_empresa
ORDER BY c.nombre_empresa;

-- Ver estado de documentos
SELECT
  c.nombre_empresa,
  td.nombre as tipo_documento,
  d.estado,
  d.fecha_carga,
  d.fecha_vencimiento
FROM public.documentos d
INNER JOIN public.requerimientos_cliente rc ON rc.id = d.requerimiento_cliente_id
INNER JOIN public.clientes c ON c.id = rc.cliente_id
INNER JOIN public.tipos_documento td ON td.id = rc.tipo_documento_id
ORDER BY c.nombre_empresa, td.nombre;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
