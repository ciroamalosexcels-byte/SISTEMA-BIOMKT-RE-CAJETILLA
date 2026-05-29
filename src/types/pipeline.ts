export interface PipelineStage {
  id: string
  label: string
  color: string
  order: number
  isWon?: boolean
}

export const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
  { id: "CRM",         label: "Prospecto",   color: "#ef4444", order: 0 },
  { id: "REUNION_1",   label: "Reunión 1",   color: "#f97316", order: 1 },
  { id: "REUNION_2",   label: "Reunión 2",   color: "#eab308", order: 2 },
  { id: "SEGUIMIENTO", label: "Seguimiento", color: "#3b82f6", order: 3 },
  { id: "CLIENTES",    label: "Cliente ✓",   color: "#22c55e", order: 4, isWon: true },
]
