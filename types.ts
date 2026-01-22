
export enum UserRole {
  ADMIN = 'ADMIN',
  GESTOR = 'GESTOR'
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  password?: string;
  role: UserRole;
  organization: string;
  city: string;
}

export interface AppSettings {
  title: string;
  logo: string | null;
  sealTypes: string[];
  themeColor: string;
}

export enum SealStatus {
  ENTRADA_INVENTARIO = 'ENTRADA_INVENTARIO',
  ASIGNADO = 'ASIGNADO',
  ENTREGADO = 'ENTREGADO',
  INSTALADO = 'INSTALADO',
  SALIDA_FABRICA = 'SALIDA_FABRICA',
  NO_INSTALADO = 'NO_INSTALADO',
  DESTRUIDO = 'DESTRUIDO'
}

export interface MovementHistory {
  date: string;
  fromStatus: SealStatus | null;
  toStatus: SealStatus;
  user: string;
  details: string;
  fields?: Record<string, string>; // Almacena campos específicos del movimiento
}

export interface Seal {
  id: string;
  type: string;
  status: SealStatus;
  creationDate: string;
  lastMovement: string;
  entryUser: string;
  city: string;
  history: MovementHistory[];
  
  // Campos dinámicos acumulados
  orderNumber?: string;
  containerId?: string;
  vehiclePlate?: string;
  assignedTo?: string;
  deliveredTo?: string;
  driverName?: string;
  destination?: string;
  observations?: string;
}

export interface FilterOptions {
  idSello: string;
  estado: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
}
