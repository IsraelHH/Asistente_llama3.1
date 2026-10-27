-- ====================================================================
-- Script SQL para Supabase (Tabla de Telemetría Ambiental y Dictamen IA)
-- Pega este código en el "SQL Editor" de tu panel de Supabase y haz clic en "Run"
-- ====================================================================

-- 1. Crear tabla de telemetría
CREATE TABLE IF NOT EXISTS public.telemetria (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    temperatura NUMERIC(5,2),
    humedad NUMERIC(5,2),
    presion NUMERIC(7,2),
    gas INTEGER,
    luz INTEGER,
    cielo TEXT,
    lluvia TEXT,
    sugerencia_ia TEXT
);

-- 2. Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE public.telemetria ENABLE ROW LEVEL SECURITY;

-- 3. Permitir lectura pública (para el Dashboard en Vercel)
DROP POLICY IF EXISTS "Permitir lectura publica" ON public.telemetria;
CREATE POLICY "Permitir lectura publica" ON public.telemetria
    FOR SELECT TO anon USING (true);

-- 4. Permitir inserción anónima (para que el backend en Python o ESP32 inserte datos)
DROP POLICY IF EXISTS "Permitir insercion anonima" ON public.telemetria;
CREATE POLICY "Permitir insercion anonima" ON public.telemetria
    FOR INSERT TO anon WITH CHECK (true);

-- 5. Habilitar Realtime para actualizaciones instantáneas en el dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.telemetria;

-- 6. Insertar un primer registro de prueba para verificar funcionamiento
INSERT INTO public.telemetria (temperatura, humedad, presion, gas, luz, cielo, lluvia, sugerencia_ia)
VALUES (
    22.5,
    52.0,
    1013.2,
    430,
    720,
    'Despejado / Luz natural',
    'Baja',
    'Condiciones térmicas y de calidad de aire ideales bajo estándares ISO 7730 e ISO 17772-1. No se requiere ventilación forzada.'
);
