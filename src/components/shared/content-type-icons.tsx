/* ── Íconos de tipo de contenido — calendario y tarjetas de Clientes ─── */
export function HistoriaIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" strokeDasharray="7.5 5.5" />
    </svg>
  );
}
export function ReelIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4.2c0-1.1 1.2-1.75 2.1-1.15l12 8c.8.53.8 1.72 0 2.25l-12 8c-.9.6-2.1-.05-2.1-1.15V4.2z" />
    </svg>
  );
}
export function PublicacionIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="14" height="14" rx="4" opacity="0.5" />
      <rect x="7" y="7" width="14" height="14" rx="4" />
    </svg>
  );
}
export const CONTENT_TYPE_ICON: Record<string, (props: { size?: number }) => JSX.Element> = {
  HISTORIA: HistoriaIcon,
  REEL: ReelIcon,
  PLACA: PublicacionIcon,
};
