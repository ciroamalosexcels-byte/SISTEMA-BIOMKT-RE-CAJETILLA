CREATE TABLE IF NOT EXISTS public.progress_mode (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  mode text NOT NULL DEFAULT 'estado' CHECK (mode IN ('estado', 'contratado')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.progress_mode (id, mode)
VALUES (1, 'estado')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.progress_mode ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.progress_mode FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.progress_mode TO service_role;

COMMENT ON TABLE public.progress_mode IS 'Fila única global: qué mide el círculo de progreso de Clientes — estado mensual de eventos o contratado/hecho.';
