export type UserRole = 'admin' | 'gestor' | 'executor' | 'consulta'

export type InspectionItemStatus = 'conforme' | 'nao_conforme' | 'nao_aplica'

export type TicketStatus =
  | 'Aberto'
  | 'Em analise'
  | 'Em execucao'
  | 'Aguardando informacao'
  | 'Concluido'
  | 'Validado'
  | 'Reaberto'
  | 'Cancelado'

export type Priority = 'Baixa' | 'Media' | 'Alta' | 'Urgente'

export type TicketOrigin = 'Manual' | 'Vistoria'

export interface Coordinates {
  latitude: number
  longitude: number
  accuracy?: number
  capturedAt: string
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  teamId?: string
}

export interface Department {
  id: string
  name: string
}

export interface Sector {
  id: string
  name: string
  departmentId: string
}

export interface LocationType {
  id: string
  name: string
}

export interface Location {
  id: string
  name: string
  address: string
  sectorId: string
  typeId: string
  active: boolean
}

export interface InspectionCategory {
  id: string
  name: string
}

export interface ChecklistItem {
  id: string
  title: string
  categoryId: string
  required: boolean
  active: boolean
}

export interface Team {
  id: string
  name: string
  sectorId: string
  lead: string
}

export interface Attachment {
  id: string
  name: string
  dataUrl: string
  createdAt: string
  coordinates?: Coordinates | null
}

export interface InspectionAnswer {
  checklistItemId: string
  status: InspectionItemStatus
  notes: string
  photos: Attachment[]
  openTicket: boolean
}

export interface Inspection {
  id: string
  number: string
  createdAt: string
  finalizedAt?: string
  inspectorId: string
  sectorId: string
  locationId: string
  categoryId: string
  status: 'Rascunho' | 'Finalizada'
  generalNotes: string
  coordinates?: Coordinates | null
  answers: InspectionAnswer[]
}

export interface TicketHistory {
  id: string
  at: string
  userId: string
  from?: TicketStatus
  to: TicketStatus
  note: string
}

export interface TicketComment {
  id: string
  at: string
  userId: string
  text: string
}

export interface Ticket {
  id: string
  number: string
  origin: TicketOrigin
  inspectionId?: string
  checklistItemId?: string
  locationId: string
  sectorId: string
  categoryId: string
  description: string
  priority: Priority
  teamId: string
  dueDate: string
  status: TicketStatus
  createdAt: string
  updatedAt: string
  completedAt?: string
  validatedAt?: string
  history: TicketHistory[]
  comments: TicketComment[]
  attachments: Attachment[]
  completionEvidence: Attachment[]
}

export interface Notification {
  id: string
  userId?: string
  title: string
  message: string
  createdAt: string
  read: boolean
}

export interface AuditLog {
  id: string
  at: string
  userId: string
  action: string
  entity: string
  entityId: string
  description: string
}

export interface SyncQueueItem {
  id: string
  createdAt: string
  syncedAt?: string
  status: 'pending' | 'synced' | 'error'
  action: string
  entity: string
  entityId: string
  attempts: number
  lastError?: string
}

export interface AppData {
  users: User[]
  departments: Department[]
  sectors: Sector[]
  locationTypes: LocationType[]
  locations: Location[]
  categories: InspectionCategory[]
  checklistItems: ChecklistItem[]
  teams: Team[]
  inspections: Inspection[]
  tickets: Ticket[]
  notifications: Notification[]
  auditLogs: AuditLog[]
  syncQueue: SyncQueueItem[]
}
