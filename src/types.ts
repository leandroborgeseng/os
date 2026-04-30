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

export type Criticality = 'Baixa' | 'Media' | 'Alta' | 'Critica'

export type NonConformityStatus = 'Aberta' | 'Em adequacao' | 'Corrigida' | 'Validada' | 'Vencida' | 'Cancelada'

export type CitizenReportStatus = 'Recebida' | 'Em triagem' | 'Encaminhada' | 'Vistoria agendada' | 'Concluida' | 'Arquivada'

export type OfficialDocumentType = 'Auto de Infracao' | 'Notificacao' | 'Interdicao' | 'Apreensao' | 'Embargo' | 'Relatorio de Vistoria'

export type OfficialDocumentStatus = 'Gerado' | 'Assinado' | 'Recusado' | 'Impresso' | 'Cancelado'

export type QuestionResponseType =
  | 'conformidade'
  | 'sim_nao'
  | 'texto'
  | 'numero'
  | 'data'
  | 'selecao_unica'
  | 'multipla_escolha'
  | 'foto'
  | 'assinatura'
  | 'geolocalizacao'

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

export interface ServiceArea {
  id: string
  name: string
  description: string
  departmentId?: string
  active: boolean
}

export interface InspectionType {
  id: string
  serviceAreaId: string
  name: string
  description: string
  targetLabel: string
  active: boolean
}

export interface InspectionScript {
  id: string
  serviceAreaId: string
  inspectionTypeId: string
  name: string
  description: string
  version: number
  active: boolean
}

export interface ScriptSection {
  id: string
  scriptId: string
  title: string
  description: string
  order: number
}

export interface ScriptQuestionOption {
  id: string
  label: string
  riskScore?: number
}

export interface ScriptQuestion {
  id: string
  scriptId: string
  sectionId: string
  code: string
  title: string
  guidance: string
  responseType: QuestionResponseType
  options: ScriptQuestionOption[]
  required: boolean
  evidenceRequired: boolean
  observationRequired: boolean
  autoCreateTicket: boolean
  defaultCorrectionDays?: number
  criticality: Criticality
  legalReference?: string
  order: number
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
  serviceAreaId?: string
  inspectionTypeId?: string
  scriptId?: string
  sectorId: string
  locationId: string
  categoryId: string
  status: 'Rascunho' | 'Finalizada'
  generalNotes: string
  coordinates?: Coordinates | null
  /** Denuncia do portal vinculada quando a vistoria atende a um protocolo (preenchido ao finalizar). */
  citizenReportId?: string
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

export interface NonConformityHistory {
  id: string
  at: string
  userId: string
  from?: NonConformityStatus
  to: NonConformityStatus
  note: string
}

export interface NonConformity {
  id: string
  number: string
  inspectionId: string
  checklistItemId: string
  serviceAreaId?: string
  inspectionTypeId?: string
  scriptId?: string
  locationId: string
  sectorId: string
  categoryId: string
  title: string
  description: string
  criticality: Criticality
  legalReference?: string
  dueDate: string
  status: NonConformityStatus
  responsibleTeamId?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  evidence: Attachment[]
  validationNotes?: string
  history: NonConformityHistory[]
}

export interface CitizenReport {
  id: string
  protocol: string
  createdAt: string
  updatedAt: string
  status: CitizenReportStatus
  categoryId: string
  serviceAreaId?: string
  groupId?: string
  title: string
  description: string
  address: string
  coordinates?: Coordinates | null
  anonymous: boolean
  citizenName?: string
  citizenContact?: string
  attachments: Attachment[]
  triageNotes?: string
  assignedSectorId?: string
  linkedInspectionId?: string
  linkedTicketId?: string
  history: Array<{
    id: string
    at: string
    status: CitizenReportStatus
    note: string
    userId?: string
  }>
}

export interface CitizenReportGroup {
  id: string
  number: string
  createdAt: string
  updatedAt: string
  serviceAreaId?: string
  categoryId: string
  title: string
  normalizedReason: string
  coordinates?: Coordinates | null
  reportIds: string[]
  status: CitizenReportStatus
}

export interface OfficialDocumentSignature {
  id: string
  signedAt: string
  signerName: string
  signerDocument?: string
  signerRole: 'Fiscal' | 'Responsavel' | 'Testemunha'
  method: 'Tela' | 'Recusa' | 'Sistema'
  notes?: string
}

export interface OfficialDocument {
  id: string
  number: string
  type: OfficialDocumentType
  status: OfficialDocumentStatus
  createdAt: string
  updatedAt: string
  createdBy: string
  inspectionId?: string
  nonConformityId?: string
  citizenReportId?: string
  locationId?: string
  /** Endereco informado pelo cidadao quando nao ha local cadastrado vinculado. */
  externalAddress?: string
  serviceAreaId?: string
  title: string
  facts: string
  legalBasis: string
  measures: string
  defenseDeadlineDays?: number
  regularizationDeadlineDays?: number
  penalty?: string
  coordinates?: Coordinates | null
  signatures: OfficialDocumentSignature[]
  printedAt?: string
  qrCodePayload: string
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
  serviceAreas: ServiceArea[]
  inspectionTypes: InspectionType[]
  inspectionScripts: InspectionScript[]
  scriptSections: ScriptSection[]
  scriptQuestions: ScriptQuestion[]
  teams: Team[]
  inspections: Inspection[]
  tickets: Ticket[]
  nonConformities: NonConformity[]
  citizenReports: CitizenReport[]
  citizenReportGroups: CitizenReportGroup[]
  officialDocuments: OfficialDocument[]
  notifications: Notification[]
  auditLogs: AuditLog[]
  syncQueue: SyncQueueItem[]
}
