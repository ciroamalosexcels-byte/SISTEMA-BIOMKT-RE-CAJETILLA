export type StatusColor = "red" | "yellow" | "green" | "lime" | "";

export type BadgeKey = "wood" | "bronze" | "silver" | "gold";

export type Status91 = Record<string, string>;

export interface MonthlyPoint {
  puntos: string;
  detalles: string;
  fecha: string;
  estado: StatusColor;
}

export interface TeamMember {
  id: string;
  nombre: string;
  edad?: string;
  equipo?: string;
  roles?: string;
  horarios?: string;
  sueldo?: string;
  activo?: boolean;
  sueno?: string;
  telefono?: string;
  mail?: string;
  direccion?: string;
  fechaNacimiento?: string;
  notas?: string;
  signo?: string;
  signoChino?: string;
  status91: Status91;
  badges: BadgeKey[];
  monthlyPoints?: MonthlyPoint[];
}
