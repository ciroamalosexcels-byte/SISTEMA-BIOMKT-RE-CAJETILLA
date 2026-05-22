export type StatusColor = "red" | "yellow" | "green" | "lime" | "";

export type BadgeKey = "wood" | "bronze" | "silver" | "gold";

export interface Status91 {
  ventas: StatusColor;
  atencion: StatusColor;
  equipo: StatusColor;
  puntualidad: StatusColor;
  updatedAt?: string;
}

export interface TeamMember {
  id: string;
  nombre: string;
  // Profile data
  telefono?: string;
  mail?: string;
  direccion?: string;
  fechaNacimiento?: string;
  notas?: string;
  // Zodiac (computed or stored)
  signo?: string;
  signoChino?: string;
  // Status 9.1
  status91: Status91;
  // Badges awarded
  badges: BadgeKey[];
}
