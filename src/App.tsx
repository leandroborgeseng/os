import {
  AlertTriangle,
  Building2,
  Camera,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Cloud,
  Download,
  Eye,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MapPin,
  Paperclip,
  Printer,
  Search,
  ShieldCheck,
  TicketCheck,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'
import L from 'leaflet'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { clsx } from 'clsx'
import 'leaflet/dist/leaflet.css'
import { isBluetoothPrintSupported, printerPresets, printEscPosTestPage, type PrinterPresetId } from './bluetoothPrinter'
import { loadData, loadRemoteData, makeId, nextProtocol, resetData, resetRemoteData, saveData, saveRemoteData } from './storage'
import type {
  AppData,
  Attachment,
  AuditLog,
  CitizenReport,
  CitizenReportGroup,
  CitizenReportStatus,
  ChecklistItem,
  Coordinates,
  Criticality,
  Inspection,
  InspectionAnswer,
  InspectionItemStatus,
  Location,
  NonConformity,
  NonConformityStatus,
  OfficialDocument,
  OfficialDocumentStatus,
  OfficialDocumentType,
  Priority,
  QuestionResponseType,
  ScriptQuestion,
  Ticket,
  TicketStatus,
  User,
  UserRole,
} from './types'

type Page = 'dashboard' | 'cadastros' | 'roteiros' | 'denuncias' | 'vistorias' | 'planos' | 'documentos' | 'chamados' | 'relatorios' | 'impressao' | 'auditoria'

type AppMaps = {
  users: Record<string, AppData['users'][number]>
  departments: Record<string, AppData['departments'][number]>
  sectors: Record<string, AppData['sectors'][number]>
  locations: Record<string, AppData['locations'][number]>
  categories: Record<string, AppData['categories'][number]>
  teams: Record<string, AppData['teams'][number]>
  checklistItems: Record<string, AppData['checklistItems'][number]>
  locationTypes: Record<string, AppData['locationTypes'][number]>
  serviceAreas: Record<string, AppData['serviceAreas'][number]>
  inspectionTypes: Record<string, AppData['inspectionTypes'][number]>
  inspectionScripts: Record<string, AppData['inspectionScripts'][number]>
  scriptSections: Record<string, AppData['scriptSections'][number]>
}

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  gestor: 'Gestor/Fiscal',
  executor: 'Responsavel pela execucao',
  consulta: 'Consulta',
}

const priorityColors: Record<Priority, string> = {
  Baixa: 'bg-emerald-100 text-emerald-700',
  Media: 'bg-sky-100 text-sky-700',
  Alta: 'bg-amber-100 text-amber-800',
  Urgente: 'bg-rose-100 text-rose-700',
}

const statusColors: Record<TicketStatus, string> = {
  Aberto: 'bg-blue-100 text-blue-700',
  'Em analise': 'bg-indigo-100 text-indigo-700',
  'Em execucao': 'bg-amber-100 text-amber-800',
  'Aguardando informacao': 'bg-purple-100 text-purple-700',
  Concluido: 'bg-teal-100 text-teal-700',
  Validado: 'bg-emerald-100 text-emerald-700',
  Reaberto: 'bg-orange-100 text-orange-700',
  Cancelado: 'bg-slate-200 text-slate-700',
}

const nonConformityStatusColors: Record<NonConformityStatus, string> = {
  Aberta: 'bg-rose-100 text-rose-700',
  'Em adequacao': 'bg-amber-100 text-amber-800',
  Corrigida: 'bg-sky-100 text-sky-800',
  Validada: 'bg-emerald-100 text-emerald-700',
  Vencida: 'bg-red-100 text-red-700',
  Cancelada: 'bg-slate-200 text-slate-700',
}

const citizenReportStatusColors: Record<CitizenReportStatus, string> = {
  Recebida: 'bg-blue-100 text-blue-700',
  'Em triagem': 'bg-amber-100 text-amber-800',
  Encaminhada: 'bg-indigo-100 text-indigo-700',
  'Vistoria agendada': 'bg-sky-100 text-sky-800',
  Concluida: 'bg-emerald-100 text-emerald-700',
  Arquivada: 'bg-slate-200 text-slate-700',
}

const officialDocumentStatusColors: Record<OfficialDocumentStatus, string> = {
  Gerado: 'bg-blue-100 text-blue-700',
  Assinado: 'bg-emerald-100 text-emerald-700',
  Recusado: 'bg-amber-100 text-amber-800',
  Impresso: 'bg-sky-100 text-sky-800',
  Cancelado: 'bg-slate-200 text-slate-700',
}

const pageConfig: Array<{ id: Page; label: string; icon: ReactNode; roles: UserRole[] }> = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, roles: ['admin', 'gestor', 'executor', 'consulta'] },
  { id: 'cadastros', label: 'Cadastros', icon: <Building2 size={18} />, roles: ['admin'] },
  { id: 'roteiros', label: 'Roteiros', icon: <FileText size={18} />, roles: ['admin', 'gestor'] },
  { id: 'denuncias', label: 'Denuncias', icon: <AlertTriangle size={18} />, roles: ['admin', 'gestor', 'consulta'] },
  { id: 'vistorias', label: 'Vistorias', icon: <ClipboardCheck size={18} />, roles: ['admin', 'gestor'] },
  { id: 'planos', label: 'Planos de acao', icon: <AlertTriangle size={18} />, roles: ['admin', 'gestor', 'executor', 'consulta'] },
  { id: 'documentos', label: 'Documentos', icon: <FileText size={18} />, roles: ['admin', 'gestor', 'consulta'] },
  { id: 'chamados', label: 'Chamados', icon: <TicketCheck size={18} />, roles: ['admin', 'gestor', 'executor', 'consulta'] },
  { id: 'relatorios', label: 'Relatorios', icon: <FileText size={18} />, roles: ['admin', 'gestor', 'consulta'] },
  { id: 'impressao', label: 'Impressao', icon: <Printer size={18} />, roles: ['admin', 'gestor', 'executor'] },
  { id: 'auditoria', label: 'Auditoria', icon: <ShieldCheck size={18} />, roles: ['admin'] },
]

const chartColors = ['#2563eb', '#0f766e', '#f59e0b', '#dc2626', '#7c3aed', '#475569', '#ea580c', '#16a34a']

function formatDate(value?: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function dateOnly(value?: string) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

function isOverdue(ticket: Ticket) {
  return !['Concluido', 'Validado', 'Cancelado'].includes(ticket.status) && new Date(ticket.dueDate) < new Date()
}

function isNearDue(ticket: Ticket) {
  const diff = new Date(ticket.dueDate).getTime() - Date.now()
  return diff >= 0 && diff <= 3 * 86400000 && !['Concluido', 'Validado', 'Cancelado'].includes(ticket.status)
}

function isNonConformityOverdue(nonConformity: NonConformity) {
  return !['Corrigida', 'Validada', 'Cancelada'].includes(nonConformity.status) && new Date(nonConformity.dueDate) < new Date()
}

function defaultDueDate() {
  const date = new Date()
  date.setDate(date.getDate() + 5)
  return dateOnly(date.toISOString())
}

function addAuditAndSyncQueue(data: AppData, user: User, action: string, entity: string, entityId: string, description: string): AppData {
  const timestamp = new Date().toISOString()
  const auditLog: AuditLog = {
    id: makeId('audit'),
    at: timestamp,
    userId: user.id,
    action,
    entity,
    entityId,
    description,
  }

  return {
    ...data,
    auditLogs: [auditLog, ...data.auditLogs],
    syncQueue: [
      {
        id: makeId('sync'),
        createdAt: timestamp,
        status: 'pending',
        action,
        entity,
        entityId,
        attempts: 0,
      },
      ...(data.syncQueue ?? []),
    ],
  }
}

function getCurrentCoordinates(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalizacao indisponivel neste dispositivo.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date().toISOString(),
        }),
      reject,
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    )
  })
}

async function filesToAttachments(files: FileList | null, coordinates?: Coordinates | null): Promise<Attachment[]> {
  if (!files) return []

  return Promise.all(
    Array.from(files).map(
      (file) =>
        new Promise<Attachment>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            resolve({
              id: makeId('file'),
              name: file.name,
              dataUrl: String(reader.result),
              createdAt: new Date().toISOString(),
              coordinates,
            })
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        }),
    ),
  )
}

function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', className)}>{children}</span>
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={clsx('rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5', className)}>{children}</section>
}

function SectionTitle({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div>
      {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">{eyebrow}</p>}
      <h2 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100'

const defaultMapCenter: L.LatLngExpression = [-23.55052, -46.633308]

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center sm:p-8">
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </div>
  )
}

function formatCoordinates(coordinates?: Coordinates | null) {
  if (!coordinates) return 'Sem coordenadas'

  const accuracy = coordinates.accuracy ? ` • precisao ${Math.round(coordinates.accuracy)}m` : ''
  return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}${accuracy}`
}

function distanceInMeters(a?: Coordinates | null, b?: Coordinates | null) {
  if (!a || !b) return Number.POSITIVE_INFINITY
  const earthRadius = 6371000
  const toRadians = (value: number) => (value * Math.PI) / 180
  const deltaLat = toRadians(b.latitude - a.latitude)
  const deltaLng = toRadians(b.longitude - a.longitude)
  const lat1 = toRadians(a.latitude)
  const lat2 = toRadians(b.latitude)
  const h =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)

  return 2 * earthRadius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function normalizeReason(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 8)
    .join(' ')
}

function reasonSimilarity(a: string, b: string) {
  const wordsA = new Set(normalizeReason(a).split(' ').filter(Boolean))
  const wordsB = new Set(normalizeReason(b).split(' ').filter(Boolean))
  const union = new Set([...wordsA, ...wordsB])

  if (union.size === 0) return 0

  const intersection = [...wordsA].filter((word) => wordsB.has(word))
  return intersection.length / union.size
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

async function resolveAddressQuery(query: string): Promise<string> {
  const cep = onlyDigits(query)

  if (cep.length !== 8) {
    return `${query}, Brasil`
  }

  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
  if (!response.ok) {
    throw new Error('Nao foi possivel consultar o CEP.')
  }

  const address = (await response.json()) as {
    erro?: boolean
    logradouro?: string
    bairro?: string
    localidade?: string
    uf?: string
  }

  if (address.erro) {
    throw new Error('CEP nao encontrado.')
  }

  return [address.logradouro, address.bairro, address.localidade, address.uf, 'Brasil'].filter(Boolean).join(', ')
}

async function geocodeAddress(query: string): Promise<Coordinates> {
  const resolvedQuery = await resolveAddressQuery(query)
  const params = new URLSearchParams({
    q: resolvedQuery,
    format: 'json',
    limit: '1',
    countrycodes: 'br',
  })

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`)
  if (!response.ok) {
    throw new Error('Nao foi possivel localizar o endereco no mapa.')
  }

  const results = (await response.json()) as Array<{ lat: string; lon: string }>
  const first = results[0]

  if (!first) {
    throw new Error('Endereco nao encontrado no mapa.')
  }

  return {
    latitude: Number(first.lat),
    longitude: Number(first.lon),
    capturedAt: new Date().toISOString(),
  }
}

function MapPicker({ value, onChange }: { value?: Coordinates | null; onChange: (coordinates: Coordinates) => void }) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.CircleMarker | null>(null)
  const onChangeRef = useRef(onChange)
  const [addressQuery, setAddressQuery] = useState('')
  const [searchStatus, setSearchStatus] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) return

    const map = L.map(mapNodeRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(defaultMapCenter, 13)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.control.attribution({ prefix: false, position: 'bottomleft' }).addAttribution('&copy; OpenStreetMap').addTo(map)

    map.on('click', (event: L.LeafletMouseEvent) => {
      onChangeRef.current({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
        capturedAt: new Date().toISOString(),
      })
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !value) return

    const latLng: L.LatLngExpression = [value.latitude, value.longitude]
    if (!markerRef.current) {
      markerRef.current = L.circleMarker(latLng, {
        radius: 9,
        color: '#ffffff',
        weight: 3,
        fillColor: '#2563eb',
        fillOpacity: 1,
      }).addTo(map)
    } else {
      markerRef.current.setLatLng(latLng)
    }
    map.setView(latLng, Math.max(map.getZoom(), 17))
  }, [value])

  const locate = async () => {
    const coordinates = await getCurrentCoordinates()
    onChangeRef.current(coordinates)
  }

  const searchAddress = async () => {
    if (!addressQuery.trim()) return

    if (!navigator.onLine) {
      setSearchStatus('Busca por endereco precisa de internet. Use o GPS e sincronize depois.')
      return
    }

    setIsSearching(true)
    setSearchStatus('Buscando endereco...')
    try {
      const coordinates = await geocodeAddress(addressQuery)
      onChangeRef.current(coordinates)
      setSearchStatus('Endereco localizado. Confira o marcador no mapa.')
    } catch (error) {
      setSearchStatus(error instanceof Error ? error.message : 'Nao foi possivel buscar o endereco.')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
      <div ref={mapNodeRef} className="h-72 w-full sm:h-80" />
      <div className="space-y-3 border-t border-slate-200 bg-white p-4">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault()
            searchAddress()
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
            <input
              className={clsx(inputClass, 'pl-10')}
              value={addressQuery}
              onChange={(event) => setAddressQuery(event.target.value)}
              placeholder="Digite endereco ou CEP"
              inputMode="search"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            <MapPin size={16} />
            Localizar
          </button>
        </form>
        {searchStatus && <div className="rounded-2xl bg-blue-50 p-3 text-xs font-semibold text-blue-700">{searchStatus}</div>}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">Geolocalizacao da vistoria</p>
            <p className="text-xs text-slate-500">Busque por endereco/CEP, toque no mapa ou use o GPS do dispositivo.</p>
          </div>
          <button type="button" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white" onClick={locate}>
            <MapPin size={16} />
            Usar minha localizacao
          </button>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-xs font-semibold text-slate-600">{formatCoordinates(value)}</div>
      </div>
    </div>
  )
}

function App() {
  const [data, setData] = useState<AppData>(() => loadData())
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [activePage, setActivePage] = useState<Page>(() => {
    const shortcut = new URLSearchParams(window.location.search).get('atalho')
    return pageConfig.some((page) => page.id === shortcut) ? (shortcut as Page) : 'dashboard'
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const remoteLoadedRef = useRef(false)

  useEffect(() => {
    saveData(data)

    if (!remoteLoadedRef.current || !isOnline) {
      return
    }

    const timeout = window.setTimeout(() => {
      saveRemoteData(data)
        .then(() => setLastSyncAt(new Date().toISOString()))
        .catch(() => undefined)
    }, 500)

    return () => window.clearTimeout(timeout)
  }, [data, isOnline])

  useEffect(() => {
    let cancelled = false

    loadRemoteData()
      .then((remoteData) => {
        if (cancelled) return
        setData(remoteData)
        setLastSyncAt(new Date().toISOString())
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          remoteLoadedRef.current = true
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    const onInstalled = () => setInstallPrompt(null)

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const maps: AppMaps = useMemo(
    () => ({
      users: Object.fromEntries(data.users.map((item) => [item.id, item])),
      departments: Object.fromEntries(data.departments.map((item) => [item.id, item])),
      sectors: Object.fromEntries(data.sectors.map((item) => [item.id, item])),
      locations: Object.fromEntries(data.locations.map((item) => [item.id, item])),
      categories: Object.fromEntries(data.categories.map((item) => [item.id, item])),
      teams: Object.fromEntries(data.teams.map((item) => [item.id, item])),
      checklistItems: Object.fromEntries(data.checklistItems.map((item) => [item.id, item])),
      locationTypes: Object.fromEntries(data.locationTypes.map((item) => [item.id, item])),
      serviceAreas: Object.fromEntries(data.serviceAreas.map((item) => [item.id, item])),
      inspectionTypes: Object.fromEntries(data.inspectionTypes.map((item) => [item.id, item])),
      inspectionScripts: Object.fromEntries(data.inspectionScripts.map((item) => [item.id, item])),
      scriptSections: Object.fromEntries(data.scriptSections.map((item) => [item.id, item])),
    }),
    [data],
  )

  const permittedPages = currentUser ? pageConfig.filter((page) => page.roles.includes(currentUser.role)) : []

  const commitPublic = (producer: (draft: AppData) => AppData) => {
    setData(producer)
  }

  const commit = (producer: (draft: AppData) => AppData, action: string, entity: string, entityId: string, description: string) => {
    if (!currentUser) return
    setData((previous) => addAuditAndSyncQueue(producer(previous), currentUser, action, entity, entityId, description))
  }

  const pendingSyncCount = data.syncQueue.filter((item) => item.status === 'pending').length

  const synchronizePending = () => {
    if (!isOnline || pendingSyncCount === 0) return

    const syncedAt = new Date().toISOString()
    setData((previous) => ({
      ...previous,
      syncQueue: previous.syncQueue.map((item) =>
        item.status === 'pending'
          ? {
              ...item,
              status: 'synced',
              syncedAt,
              attempts: item.attempts + 1,
              lastError: undefined,
            }
          : item,
      ),
      notifications: [
        {
          id: makeId('notif'),
          title: 'Sincronizacao concluida',
          message: `${pendingSyncCount} registro(s) enviado(s) para a base principal.`,
          createdAt: syncedAt,
          read: false,
        },
        ...previous.notifications,
      ],
    }))
    setLastSyncAt(syncedAt)
  }

  const requestInstall = async () => {
    if (!installPrompt) return

    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  const portal = new URLSearchParams(window.location.search).get('portal')

  if (portal === 'cidadao') {
    return <CitizenPortal data={data} commitPublic={commitPublic} />
  }

  if (!currentUser) {
    return <LoginPage data={data} onLogin={setCurrentUser} />
  }

  const renderPage = () => {
    if (activePage === 'dashboard') {
      return <Dashboard data={data} maps={maps} />
    }
    if (activePage === 'cadastros') {
      return <Registrations data={data} maps={maps} currentUser={currentUser} commit={commit} />
    }
    if (activePage === 'roteiros') {
      return <InspectionScriptsAdmin data={data} maps={maps} currentUser={currentUser} commit={commit} />
    }
    if (activePage === 'denuncias') {
      return <CitizenReportsAdmin data={data} maps={maps} currentUser={currentUser} commit={commit} />
    }
    if (activePage === 'vistorias') {
      return <Inspections data={data} maps={maps} currentUser={currentUser} commit={commit} />
    }
    if (activePage === 'planos') {
      return <ActionPlans data={data} maps={maps} currentUser={currentUser} commit={commit} />
    }
    if (activePage === 'documentos') {
      return <OfficialDocuments data={data} maps={maps} currentUser={currentUser} commit={commit} />
    }
    if (activePage === 'chamados') {
      return <Tickets data={data} maps={maps} currentUser={currentUser} commit={commit} query={query} setQuery={setQuery} />
    }
    if (activePage === 'relatorios') {
      return <Reports data={data} maps={maps} />
    }
    if (activePage === 'impressao') {
      return <PrintSettings />
    }
    return <Audit data={data} maps={maps} />
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {sidebarOpen && <button type="button" aria-label="Fechar menu" className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 w-[min(86vw,18rem)] border-r border-slate-200 bg-slate-950 p-5 text-white transition lg:w-72 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-blue-600">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-200">Prefeitura</p>
              <h1 className="text-lg font-bold">Vistorias e Chamados</h1>
            </div>
          </div>
          <button className="lg:hidden" type="button" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu">
            <X size={22} />
          </button>
        </div>

        <nav className="mt-8 space-y-2">
          {permittedPages.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => {
                setActivePage(page.id)
                setSidebarOpen(false)
              }}
              className={clsx(
                'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition',
                activePage === page.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/30' : 'text-slate-300 hover:bg-white/10 hover:text-white',
              )}
            >
              {page.icon}
              {page.label}
            </button>
          ))}
        </nav>

        <div className="absolute inset-x-5 bottom-5 rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold">{currentUser.name}</p>
          <p className="text-xs text-slate-300">{roleLabels[currentUser.role]}</p>
          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-bold text-slate-950"
            onClick={() => setCurrentUser(null)}
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-8 lg:py-4">
          <div className="flex items-center justify-between gap-4">
            <button className="rounded-2xl border border-slate-200 p-3 lg:hidden" type="button" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu completo">
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Sistema administrativo</p>
              <h2 className="truncate text-xl font-bold text-slate-950">{pageConfig.find((page) => page.id === activePage)?.label}</h2>
            </div>
            <div className="ml-auto hidden items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 md:flex">
              <CalendarClock size={18} className="text-blue-600" />
              <span className="text-sm font-semibold">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date())}</span>
            </div>
            {installPrompt && (
              <button
                type="button"
                onClick={requestInstall}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-3 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 sm:px-4 sm:py-2"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Instalar app</span>
              </button>
            )}
          </div>
          <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              {isOnline ? <Wifi size={16} className="text-emerald-600" /> : <WifiOff size={16} className="text-amber-600" />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
              <span className="text-slate-400">•</span>
              <span>{pendingSyncCount} item(ns) aguardando sincronizacao</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {lastSyncAt && <span className="text-slate-400">Ultima sinc.: {formatDate(lastSyncAt)}</span>}
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                disabled={!isOnline || pendingSyncCount === 0}
                onClick={synchronizePending}
              >
                <Cloud size={14} />
                Sincronizar
              </button>
            </div>
          </div>
        </header>

        <main className="px-3 py-4 pb-28 sm:px-4 lg:p-8">{renderPage()}</main>

        <nav className="fixed inset-x-3 bottom-3 z-30 rounded-[1.75rem] border border-slate-200 bg-white/95 p-2 shadow-2xl shadow-slate-950/15 backdrop-blur lg:hidden">
          <div className="grid grid-cols-4 gap-1">
            {permittedPages.slice(0, 4).map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() => setActivePage(page.id)}
                className={clsx(
                  'flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[11px] font-bold transition',
                  activePage === page.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100',
                )}
              >
                {page.icon}
                <span className="max-w-full truncate">{page.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}

function LoginPage({ data, onLogin }: { data: AppData; onLogin: (user: User) => void }) {
  const [selectedUserId, setSelectedUserId] = useState(data.users[0]?.id ?? '')

  return (
    <main className="grid min-h-screen bg-slate-950 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative overflow-hidden p-5 text-white sm:p-8 lg:p-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#2563eb55,transparent_35%),radial-gradient(circle_at_bottom_right,#0f766e55,transparent_35%)]" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-blue-600">
              <ShieldCheck size={26} />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-200">Prefeitura</p>
              <h1 className="text-2xl font-bold">Vistorias e Chamados</h1>
            </div>
          </div>

          <div className="my-10 max-w-2xl sm:my-16">
            <Badge className="bg-white/10 text-blue-100">MVP funcional com dados mockados</Badge>
            <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-6xl">Controle vistorias, nao conformidades e execucao em um so lugar.</h2>
            <p className="mt-4 max-w-xl text-base text-slate-300 sm:text-lg">
              Plataforma responsiva para fiscalizacao em campo, abertura de chamados, acompanhamento por SLA e relatorios gerenciais.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
            <p className="rounded-2xl border border-white/10 bg-white/5 p-4">Protocolos automaticos</p>
            <p className="rounded-2xl border border-white/10 bg-white/5 p-4">Fluxo de validacao</p>
            <p className="rounded-2xl border border-white/10 bg-white/5 p-4">Auditoria das acoes</p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center bg-slate-100 p-4 sm:p-6">
        <Card className="w-full max-w-md">
          <SectionTitle title="Entrar no sistema" description="Selecione um perfil para acessar o prototipo. A senha e apenas demonstrativa." />
          <div className="mt-6 space-y-4">
            <Field label="Usuario">
              <select className={inputClass} value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
                {data.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {roleLabels[user.role]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Senha">
              <input className={inputClass} type="password" value="prefeitura" readOnly />
            </Field>
            <button
              type="button"
              className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              onClick={() => {
                const user = data.users.find((item) => item.id === selectedUserId)
                if (user) onLogin(user)
              }}
            >
              Acessar plataforma
            </button>
            <a
              href="/?portal=cidadao"
              className="block w-full rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-center text-sm font-bold text-blue-700 transition hover:bg-blue-100"
            >
              Registrar denuncia como cidadao
            </a>
          </div>
        </Card>
      </section>
    </main>
  )
}

function CitizenPortal({ data, commitPublic }: { data: AppData; commitPublic: (producer: (draft: AppData) => AppData) => void }) {
  const [form, setForm] = useState({
    categoryId: data.categories[0]?.id ?? '',
    serviceAreaId: data.serviceAreas[0]?.id ?? '',
    title: '',
    description: '',
    address: '',
    anonymous: true,
    citizenName: '',
    citizenContact: '',
    coordinates: null as Coordinates | null,
    attachments: [] as Attachment[],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const captureLocation = async () => {
    try {
      const coordinates = await getCurrentCoordinates()
      setForm((previous) => ({ ...previous, coordinates }))
      setMessage({ type: 'success', text: 'Localizacao capturada com sucesso.' })
    } catch {
      setMessage({ type: 'error', text: 'Nao foi possivel capturar sua localizacao. Confira a permissao de GPS do navegador.' })
    }
  }

  const addCitizenPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = await filesToAttachments(event.target.files, form.coordinates)
    setForm((previous) => ({ ...previous, attachments: [...previous.attachments, ...files] }))
    event.target.value = ''
  }

  const submitReport = () => {
    if (!form.title.trim() || !form.description.trim()) {
      setMessage({ type: 'error', text: 'Informe o assunto e a descricao da denuncia antes de enviar.' })
      return
    }

    setIsSubmitting(true)
    const protocol = nextProtocol('DEN', data.citizenReports.map((item) => item.protocol))
    const existingGroup = data.citizenReportGroups.find(
      (group) =>
        group.categoryId === form.categoryId &&
        group.serviceAreaId === form.serviceAreaId &&
        distanceInMeters(group.coordinates, form.coordinates) <= 150 &&
        reasonSimilarity(group.normalizedReason, `${form.title} ${form.description}`) >= 0.35,
    )
    const groupId = existingGroup?.id ?? makeId('grupo-denuncia')
    const now = new Date().toISOString()
    const report: CitizenReport = {
      id: makeId('denuncia'),
      protocol,
      createdAt: now,
      updatedAt: now,
      status: 'Recebida',
      categoryId: form.categoryId,
      serviceAreaId: form.serviceAreaId,
      groupId,
      title: form.title,
      description: form.description,
      address: form.address,
      coordinates: form.coordinates,
      anonymous: form.anonymous,
      citizenName: form.anonymous ? undefined : form.citizenName,
      citizenContact: form.anonymous ? undefined : form.citizenContact,
      attachments: form.attachments,
      history: [
        {
          id: makeId('hist-den'),
          at: now,
          status: 'Recebida',
          note: 'Denuncia registrada pelo portal do cidadao.',
        },
      ],
    }
    const group: CitizenReportGroup = existingGroup ?? {
      id: groupId,
      number: nextProtocol('GRP', data.citizenReportGroups.map((item) => item.number)),
      createdAt: now,
      updatedAt: now,
      serviceAreaId: form.serviceAreaId,
      categoryId: form.categoryId,
      title: form.title,
      normalizedReason: normalizeReason(`${form.title} ${form.description}`),
      coordinates: form.coordinates,
      reportIds: [],
      status: 'Recebida',
    }

    commitPublic((draft) => ({
      ...draft,
      citizenReports: [report, ...draft.citizenReports],
      citizenReportGroups: existingGroup
        ? draft.citizenReportGroups.map((item) =>
            item.id === existingGroup.id
              ? {
                  ...item,
                  updatedAt: now,
                  reportIds: [report.id, ...item.reportIds],
                  status: item.status === 'Arquivada' || item.status === 'Concluida' ? 'Recebida' : item.status,
                }
              : item,
          )
        : [{ ...group, reportIds: [report.id] }, ...draft.citizenReportGroups],
      notifications: [
        {
          id: makeId('notif'),
          title: 'Nova denuncia cidada',
          message: `${protocol} foi registrada pelo portal do cidadao.`,
          createdAt: now,
          read: false,
        },
        ...draft.notifications,
      ],
    }))
    setIsSubmitting(false)
    setMessage({
      type: 'success',
      text: existingGroup
        ? `Denuncia enviada com sucesso. Protocolo: ${protocol}. Ela foi agrupada ao caso ${existingGroup.number}.`
        : `Denuncia enviada com sucesso. Protocolo: ${protocol}.`,
    })
    setForm({
      categoryId: data.categories[0]?.id ?? '',
      serviceAreaId: data.serviceAreas[0]?.id ?? '',
      title: '',
      description: '',
      address: '',
      anonymous: true,
      citizenName: '',
      citizenContact: '',
      coordinates: null,
      attachments: [],
    })
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="rounded-[2rem] bg-slate-950 p-5 text-white shadow-xl shadow-slate-950/15">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-blue-600">
              <ShieldCheck size={26} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Portal do cidadao</p>
              <h1 className="text-xl font-black">Registrar denuncia</h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-300">Envie informacoes, fotos e localizacao para a prefeitura analisar a ocorrencia. O atendimento sera acompanhado por protocolo.</p>
        </header>

        {message && (
          <div className={clsx('rounded-2xl border p-4 text-sm font-semibold', message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700')}>
            {message.text}
          </div>
        )}

        <Card>
          <div className="space-y-4">
            <Field label="Area responsavel">
              <select className={inputClass} value={form.serviceAreaId} onChange={(event) => setForm({ ...form, serviceAreaId: event.target.value })}>
                {data.serviceAreas.filter((area) => area.active).map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Categoria">
              <select className={inputClass} value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
                {data.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assunto">
              <input className={inputClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ex.: Terreno com lixo e agua parada" />
            </Field>
            <Field label="Descricao">
              <textarea className={clsx(inputClass, 'min-h-32')} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Descreva o problema com o maximo de detalhes." />
            </Field>
            <Field label="Endereco ou referencia">
              <input className={inputClass} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Rua, numero, bairro ou ponto de referencia" />
            </Field>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold">Geolocalizacao</p>
              <p className="mt-1 text-xs text-slate-500">No celular, permita o acesso ao GPS para enviar a localizacao aproximada da ocorrencia.</p>
              <div className="mt-3 rounded-xl bg-white p-3 text-xs font-semibold text-slate-600">{formatCoordinates(form.coordinates)}</div>
              <button type="button" className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white" onClick={captureLocation}>
                <MapPin size={16} />
                Usar localizacao atual
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold">Fotos ou anexos</p>
              <p className="mt-1 text-xs text-slate-500">Envie fotos do problema. Elas ajudam a triagem da secretaria responsavel.</p>
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
                <Camera size={16} />
                Adicionar foto
                <input className="hidden" type="file" multiple accept="image/*" capture="environment" onChange={addCitizenPhotos} />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                {form.attachments.map((attachment) => (
                  <div key={attachment.id} className="w-24 rounded-2xl border border-slate-200 bg-white p-2">
                    <img src={attachment.dataUrl} alt={attachment.name} className="h-16 w-full rounded-xl object-cover" />
                    <p className="mt-1 truncate text-[10px] text-slate-500">{attachment.name}</p>
                  </div>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-sm font-semibold">
              <input type="checkbox" checked={form.anonymous} onChange={(event) => setForm({ ...form, anonymous: event.target.checked })} />
              Enviar como denuncia anonima
            </label>

            {!form.anonymous && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome">
                  <input className={inputClass} value={form.citizenName} onChange={(event) => setForm({ ...form, citizenName: event.target.value })} />
                </Field>
                <Field label="Contato">
                  <input className={inputClass} value={form.citizenContact} onChange={(event) => setForm({ ...form, citizenContact: event.target.value })} placeholder="Telefone ou e-mail" />
                </Field>
              </div>
            )}

            <button type="button" disabled={isSubmitting} onClick={submitReport} className="w-full rounded-2xl bg-blue-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 disabled:opacity-50">
              Enviar denuncia
            </button>
            <a href="/" className="block text-center text-sm font-bold text-blue-700">Acessar area administrativa</a>
          </div>
        </Card>
      </div>
    </main>
  )
}

function Dashboard({ data, maps }: { data: AppData; maps: AppMaps }) {
  const statusData = Object.entries(
    data.tickets.reduce<Record<string, number>>((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] ?? 0) + 1
      return acc
    }, {}),
  ).map(([name, total]) => ({ name, total }))

  const priorityData = Object.entries(
    data.tickets.reduce<Record<string, number>>((acc, ticket) => {
      acc[ticket.priority] = (acc[ticket.priority] ?? 0) + 1
      return acc
    }, {}),
  ).map(([name, total]) => ({ name, total }))

  const validated = data.tickets.filter((ticket) => ticket.status === 'Validado').length
  const resolved = data.tickets.filter((ticket) => ['Concluido', 'Validado'].includes(ticket.status)).length
  const averageDays =
    data.tickets
      .filter((ticket) => ticket.completedAt)
      .reduce((sum, ticket) => sum + (new Date(ticket.completedAt ?? ticket.updatedAt).getTime() - new Date(ticket.createdAt).getTime()) / 86400000, 0) /
    Math.max(1, data.tickets.filter((ticket) => ticket.completedAt).length)

  const sectorData = Object.entries(
    data.tickets.reduce<Record<string, number>>((acc, ticket) => {
      const name = maps.sectors[ticket.sectorId]?.name ?? 'Sem setor'
      acc[name] = (acc[name] ?? 0) + 1
      return acc
    }, {}),
  ).map(([name, total]) => ({ name, total }))

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Visao geral" title="Painel gerencial" description="Indicadores de vistorias, chamados, prazos e desempenho operacional." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<ClipboardCheck />} label="Vistorias realizadas" value={data.inspections.filter((item) => item.status === 'Finalizada').length} tone="blue" />
        <MetricCard icon={<TicketCheck />} label="Chamados abertos" value={data.tickets.length} tone="teal" />
        <MetricCard icon={<AlertTriangle />} label="Chamados vencidos" value={data.tickets.filter(isOverdue).length} tone="rose" />
        <MetricCard icon={<CheckCircle2 />} label="% concluidos/validados" value={`${Math.round((resolved / Math.max(1, data.tickets.length)) * 100)}%`} tone="emerald" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <SectionTitle title="Chamados por status" />
            <Badge className="bg-slate-100 text-slate-700">{validated} validados</Badge>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" radius={[10, 10, 0, 0]} fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Prioridade" description={`${data.tickets.filter(isNearDue).length} chamados proximos do vencimento`} />
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={priorityData} dataKey="total" nameKey="name" innerRadius={58} outerRadius={100} paddingAngle={4}>
                  {priorityData.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {priorityData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 text-sm text-slate-600">
                <span className="size-3 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                {item.name}: {item.total}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <SectionTitle title="Chamados por secretaria/setor" />
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorData} layout="vertical" margin={{ left: 90 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={140} />
                <Tooltip />
                <Bar dataKey="total" radius={[0, 10, 10, 0]} fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <SectionTitle title="Tempo medio" description="Atendimento dos chamados concluidos" />
          <p className="mt-8 text-5xl font-black text-slate-950">{averageDays.toFixed(1)}</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">dias corridos</p>
          <div className="mt-8 space-y-3">
            {data.tickets.filter(isOverdue).slice(0, 4).map((ticket) => (
              <div key={ticket.id} className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm">
                <p className="font-bold text-rose-800">{ticket.number}</p>
                <p className="text-rose-700">{maps.locations[ticket.locationId]?.name}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: ReactNode; tone: 'blue' | 'teal' | 'rose' | 'emerald' | 'amber' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    teal: 'bg-teal-50 text-teal-700',
    rose: 'bg-rose-50 text-rose-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  }

  return (
    <Card>
      <div className={clsx('mb-5 grid size-12 place-items-center rounded-2xl', tones[tone])}>{icon}</div>
      <p className="text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">{label}</p>
    </Card>
  )
}

function Registrations({
  data,
  maps,
  currentUser,
  commit,
}: {
  data: AppData
  maps: AppMaps
  currentUser: User
  commit: (producer: (draft: AppData) => AppData, action: string, entity: string, entityId: string, description: string) => void
}) {
  const [locationForm, setLocationForm] = useState({ id: '', name: '', address: '', sectorId: data.sectors[0]?.id ?? '', typeId: data.locationTypes[0]?.id ?? '' })
  const [checklistForm, setChecklistForm] = useState({ id: '', title: '', categoryId: data.categories[0]?.id ?? '', required: true })
  const canEdit = currentUser.role === 'admin'

  const saveLocation = () => {
    if (!locationForm.name.trim() || !locationForm.address.trim()) return
    const id = locationForm.id || makeId('loc')
    const location: Location = { ...locationForm, id, active: true }
    commit(
      (draft) => ({
        ...draft,
        locations: locationForm.id ? draft.locations.map((item) => (item.id === id ? location : item)) : [location, ...draft.locations],
      }),
      locationForm.id ? 'Atualizou local' : 'Criou local',
      'locais',
      id,
      `Local ${location.name} salvo.`,
    )
    setLocationForm({ id: '', name: '', address: '', sectorId: data.sectors[0]?.id ?? '', typeId: data.locationTypes[0]?.id ?? '' })
  }

  const saveChecklist = () => {
    if (!checklistForm.title.trim()) return
    const id = checklistForm.id || makeId('chk')
    const item: ChecklistItem = { ...checklistForm, id, active: true }
    commit(
      (draft) => ({
        ...draft,
        checklistItems: checklistForm.id ? draft.checklistItems.map((entry) => (entry.id === id ? item : entry)) : [item, ...draft.checklistItems],
      }),
      checklistForm.id ? 'Atualizou checklist' : 'Criou checklist',
      'checklist_itens',
      id,
      `Item ${item.title} salvo.`,
    )
    setChecklistForm({ id: '', title: '', categoryId: data.categories[0]?.id ?? '', required: true })
  }

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Administracao" title="Cadastros basicos" description="MVP com locais e itens de checklist editaveis. Os demais cadastros estruturais ja vem mockados." />
      {!canEdit && <EmptyState title="Acesso somente leitura" text="Este perfil nao pode alterar cadastros." />}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <SectionTitle title="Locais vistoriados" description="Cadastre pracas, predios publicos, escolas e demais pontos." />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Nome">
              <input className={inputClass} value={locationForm.name} onChange={(event) => setLocationForm({ ...locationForm, name: event.target.value })} />
            </Field>
            <Field label="Tipo de local">
              <select className={inputClass} value={locationForm.typeId} onChange={(event) => setLocationForm({ ...locationForm, typeId: event.target.value })}>
                {data.locationTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Endereco">
              <input className={inputClass} value={locationForm.address} onChange={(event) => setLocationForm({ ...locationForm, address: event.target.value })} />
            </Field>
            <Field label="Setor">
              <select className={inputClass} value={locationForm.sectorId} onChange={(event) => setLocationForm({ ...locationForm, sectorId: event.target.value })}>
                {data.sectors.map((sector) => (
                  <option key={sector.id} value={sector.id}>
                    {sector.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <button type="button" disabled={!canEdit} onClick={saveLocation} className="mt-4 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
            {locationForm.id ? 'Salvar alteracoes' : 'Novo local'}
          </button>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-3">Local</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.locations.map((location) => (
                  <tr key={location.id}>
                    <td className="p-3">
                      <p className="font-semibold">{location.name}</p>
                      <p className="text-xs text-slate-500">{location.address}</p>
                    </td>
                    <td className="p-3">{maps.locationTypes[location.typeId]?.name}</td>
                    <td className="p-3">
                      <Badge className={location.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}>{location.active ? 'Ativo' : 'Inativo'}</Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 font-semibold" onClick={() => setLocationForm(location)} disabled={!canEdit}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="rounded-xl border border-slate-200 px-3 py-2 font-semibold"
                          disabled={!canEdit}
                          onClick={() =>
                            commit(
                              (draft) => ({ ...draft, locations: draft.locations.map((item) => (item.id === location.id ? { ...item, active: !item.active } : item)) }),
                              'Alterou status do local',
                              'locais',
                              location.id,
                              `Local ${location.name} marcado como ${location.active ? 'inativo' : 'ativo'}.`,
                            )
                          }
                        >
                          {location.active ? 'Inativar' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Itens de checklist" description="Itens configuraveis usados durante a vistoria." />
          <div className="mt-5 space-y-4">
            <Field label="Descricao do item">
              <input className={inputClass} value={checklistForm.title} onChange={(event) => setChecklistForm({ ...checklistForm, title: event.target.value })} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Categoria">
                <select className={inputClass} value={checklistForm.categoryId} onChange={(event) => setChecklistForm({ ...checklistForm, categoryId: event.target.value })}>
                  {data.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Obrigatorio">
                <select
                  className={inputClass}
                  value={checklistForm.required ? 'sim' : 'nao'}
                  onChange={(event) => setChecklistForm({ ...checklistForm, required: event.target.value === 'sim' })}
                >
                  <option value="sim">Sim</option>
                  <option value="nao">Nao</option>
                </select>
              </Field>
            </div>
          </div>
          <button type="button" disabled={!canEdit} onClick={saveChecklist} className="mt-4 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
            {checklistForm.id ? 'Salvar item' : 'Novo item'}
          </button>

          <div className="mt-6 space-y-3">
            {data.checklistItems.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-slate-500">
                      {maps.categories[item.categoryId]?.name} {item.required ? '• obrigatorio' : '• opcional'}
                    </p>
                  </div>
                  <Badge className={item.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}>{item.active ? 'Ativo' : 'Inativo'}</Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold" disabled={!canEdit} onClick={() => setChecklistForm(item)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
                    disabled={!canEdit}
                    onClick={() =>
                      commit(
                        (draft) => ({ ...draft, checklistItems: draft.checklistItems.map((entry) => (entry.id === item.id ? { ...entry, active: !entry.active } : entry)) }),
                        'Alterou status do checklist',
                        'checklist_itens',
                        item.id,
                        `Item ${item.title} marcado como ${item.active ? 'inativo' : 'ativo'}.`,
                      )
                    }
                  >
                    {item.active ? 'Inativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

const responseTypeLabels: Record<QuestionResponseType, string> = {
  conformidade: 'Conformidade',
  sim_nao: 'Sim/Nao',
  texto: 'Texto',
  numero: 'Numero',
  data: 'Data',
  selecao_unica: 'Selecao unica',
  multipla_escolha: 'Multipla escolha',
  foto: 'Foto',
  assinatura: 'Assinatura',
  geolocalizacao: 'Geolocalizacao',
}

const criticalityColors: Record<Criticality, string> = {
  Baixa: 'border-lime-200 bg-lime-50 text-lime-800',
  Media: 'border-amber-200 bg-amber-50 text-amber-800',
  Alta: 'border-orange-200 bg-orange-50 text-orange-800',
  Critica: 'border-rose-200 bg-rose-50 text-rose-800',
}

function InspectionScriptsAdmin({
  data,
  maps,
  currentUser,
  commit,
}: {
  data: AppData
  maps: AppMaps
  currentUser: User
  commit: (producer: (draft: AppData) => AppData, action: string, entity: string, entityId: string, description: string) => void
}) {
  const canEdit = ['admin', 'gestor'].includes(currentUser.role)
  const [selectedScriptId, setSelectedScriptId] = useState(data.inspectionScripts[0]?.id ?? '')
  const [areaForm, setAreaForm] = useState({ id: '', name: '', description: '', departmentId: data.departments[0]?.id ?? '' })
  const [typeForm, setTypeForm] = useState({ id: '', serviceAreaId: data.serviceAreas[0]?.id ?? '', name: '', description: '', targetLabel: 'Local' })
  const [scriptForm, setScriptForm] = useState({ id: '', serviceAreaId: data.serviceAreas[0]?.id ?? '', inspectionTypeId: data.inspectionTypes[0]?.id ?? '', name: '', description: '' })
  const [sectionForm, setSectionForm] = useState({ id: '', title: '', description: '' })
  const [questionForm, setQuestionForm] = useState({
    id: '',
    sectionId: data.scriptSections.find((section) => section.scriptId === selectedScriptId)?.id ?? '',
    code: '',
    title: '',
    guidance: '',
    responseType: 'conformidade' as QuestionResponseType,
    optionsText: '',
    required: true,
    evidenceRequired: false,
    observationRequired: false,
    autoCreateTicket: true,
    defaultCorrectionDays: '10',
    criticality: 'Media' as Criticality,
    legalReference: '',
  })
  const selectedScript = data.inspectionScripts.find((script) => script.id === selectedScriptId) ?? data.inspectionScripts[0]
  const selectedSections = data.scriptSections.filter((section) => section.scriptId === selectedScript?.id).sort((a, b) => a.order - b.order)
  const selectedQuestions = data.scriptQuestions.filter((question) => question.scriptId === selectedScript?.id && question.active).sort((a, b) => a.order - b.order)
  const availableTypes = data.inspectionTypes.filter((type) => type.serviceAreaId === scriptForm.serviceAreaId)

  const saveArea = () => {
    if (!areaForm.name.trim()) return
    const id = areaForm.id || makeId('area')
    const area = { ...areaForm, id, active: true }
    commit(
      (draft) => ({ ...draft, serviceAreas: areaForm.id ? draft.serviceAreas.map((item) => (item.id === id ? area : item)) : [area, ...draft.serviceAreas] }),
      areaForm.id ? 'Atualizou area de servico' : 'Criou area de servico',
      'areas_servico',
      id,
      `Area de servico ${area.name} salva.`,
    )
    setAreaForm({ id: '', name: '', description: '', departmentId: data.departments[0]?.id ?? '' })
  }

  const saveType = () => {
    if (!typeForm.name.trim()) return
    const id = typeForm.id || makeId('tipo-vistoria')
    const inspectionType = { ...typeForm, id, active: true }
    commit(
      (draft) => ({ ...draft, inspectionTypes: typeForm.id ? draft.inspectionTypes.map((item) => (item.id === id ? inspectionType : item)) : [inspectionType, ...draft.inspectionTypes] }),
      typeForm.id ? 'Atualizou tipo de vistoria' : 'Criou tipo de vistoria',
      'tipos_vistoria',
      id,
      `Tipo de vistoria ${inspectionType.name} salvo.`,
    )
    setTypeForm({ id: '', serviceAreaId: data.serviceAreas[0]?.id ?? '', name: '', description: '', targetLabel: 'Local' })
  }

  const saveScript = () => {
    if (!scriptForm.name.trim()) return
    const id = scriptForm.id || makeId('roteiro')
    const script = { ...scriptForm, id, version: 1, active: true }
    commit(
      (draft) => ({ ...draft, inspectionScripts: scriptForm.id ? draft.inspectionScripts.map((item) => (item.id === id ? script : item)) : [script, ...draft.inspectionScripts] }),
      scriptForm.id ? 'Atualizou roteiro' : 'Criou roteiro',
      'roteiros_vistoria',
      id,
      `Roteiro ${script.name} salvo.`,
    )
    setSelectedScriptId(id)
    setScriptForm({ id: '', serviceAreaId: data.serviceAreas[0]?.id ?? '', inspectionTypeId: data.inspectionTypes[0]?.id ?? '', name: '', description: '' })
  }

  const saveSection = () => {
    if (!selectedScript || !sectionForm.title.trim()) return
    const id = sectionForm.id || makeId('secao')
    const order = sectionForm.id ? maps.scriptSections[id]?.order ?? 1 : selectedSections.length + 1
    const section = { ...sectionForm, id, scriptId: selectedScript.id, order }
    commit(
      (draft) => ({ ...draft, scriptSections: sectionForm.id ? draft.scriptSections.map((item) => (item.id === id ? section : item)) : [...draft.scriptSections, section] }),
      sectionForm.id ? 'Atualizou secao de roteiro' : 'Criou secao de roteiro',
      'secoes_roteiro',
      id,
      `Secao ${section.title} salva no roteiro ${selectedScript.name}.`,
    )
    setSectionForm({ id: '', title: '', description: '' })
  }

  const saveQuestion = () => {
    if (!selectedScript || !questionForm.sectionId || !questionForm.title.trim()) return
    const id = questionForm.id || makeId('pergunta')
    const options = questionForm.optionsText
      .split(',')
      .map((option) => option.trim())
      .filter(Boolean)
      .map((label, index) => ({ id: `${id}-opcao-${index + 1}`, label }))
    const question: ScriptQuestion = {
      id,
      scriptId: selectedScript.id,
      sectionId: questionForm.sectionId,
      code: questionForm.code.trim() || `ITEM-${selectedQuestions.length + 1}`,
      title: questionForm.title,
      guidance: questionForm.guidance,
      responseType: questionForm.responseType,
      options,
      required: questionForm.required,
      evidenceRequired: questionForm.evidenceRequired,
      observationRequired: questionForm.observationRequired,
      autoCreateTicket: questionForm.autoCreateTicket,
      defaultCorrectionDays: Number(questionForm.defaultCorrectionDays) || undefined,
      criticality: questionForm.criticality,
      legalReference: questionForm.legalReference || undefined,
      order: questionForm.id ? data.scriptQuestions.find((item) => item.id === id)?.order ?? 1 : selectedQuestions.length + 1,
      active: true,
    }
    commit(
      (draft) => ({ ...draft, scriptQuestions: questionForm.id ? draft.scriptQuestions.map((item) => (item.id === id ? question : item)) : [...draft.scriptQuestions, question] }),
      questionForm.id ? 'Atualizou pergunta de roteiro' : 'Criou pergunta de roteiro',
      'perguntas_roteiro',
      id,
      `Pergunta ${question.code} salva no roteiro ${selectedScript.name}.`,
    )
    setQuestionForm({
      id: '',
      sectionId: selectedSections[0]?.id ?? '',
      code: '',
      title: '',
      guidance: '',
      responseType: 'conformidade',
      optionsText: '',
      required: true,
      evidenceRequired: false,
      observationRequired: false,
      autoCreateTicket: true,
      defaultCorrectionDays: '10',
      criticality: 'Media',
      legalReference: '',
    })
  }

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Configuracao" title="Roteiros de vistoria" description="Monte roteiros por area de servico, tipo de vistoria, secoes e perguntas configuraveis." />
      {!canEdit && <EmptyState title="Acesso somente leitura" text="Seu perfil pode consultar roteiros, mas nao pode alterar configuracoes." />}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <SectionTitle title="Areas de servico" description="Ex.: Vigilancia Sanitaria, Obras, Educacao e Meio Ambiente." />
          <div className="mt-5 space-y-4">
            <Field label="Nome da area">
              <input className={inputClass} value={areaForm.name} onChange={(event) => setAreaForm({ ...areaForm, name: event.target.value })} />
            </Field>
            <Field label="Secretaria vinculada">
              <select className={inputClass} value={areaForm.departmentId} onChange={(event) => setAreaForm({ ...areaForm, departmentId: event.target.value })}>
                {data.departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Descricao">
              <textarea className={clsx(inputClass, 'min-h-24')} value={areaForm.description} onChange={(event) => setAreaForm({ ...areaForm, description: event.target.value })} />
            </Field>
            <button type="button" disabled={!canEdit} onClick={saveArea} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
              {areaForm.id ? 'Salvar area' : 'Adicionar area'}
            </button>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Tipos de vistoria" description="Defina o alvo e a finalidade do roteiro." />
          <div className="mt-5 space-y-4">
            <Field label="Area">
              <select className={inputClass} value={typeForm.serviceAreaId} onChange={(event) => setTypeForm({ ...typeForm, serviceAreaId: event.target.value })}>
                {data.serviceAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nome do tipo">
              <input className={inputClass} value={typeForm.name} onChange={(event) => setTypeForm({ ...typeForm, name: event.target.value })} />
            </Field>
            <Field label="Rotulo do alvo">
              <input className={inputClass} value={typeForm.targetLabel} onChange={(event) => setTypeForm({ ...typeForm, targetLabel: event.target.value })} />
            </Field>
            <Field label="Descricao">
              <textarea className={clsx(inputClass, 'min-h-24')} value={typeForm.description} onChange={(event) => setTypeForm({ ...typeForm, description: event.target.value })} />
            </Field>
            <button type="button" disabled={!canEdit} onClick={saveType} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
              {typeForm.id ? 'Salvar tipo' : 'Adicionar tipo'}
            </button>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Roteiro" description="Vincule o roteiro a uma area e tipo de vistoria." />
          <div className="mt-5 space-y-4">
            <Field label="Area">
              <select
                className={inputClass}
                value={scriptForm.serviceAreaId}
                onChange={(event) => {
                  const serviceAreaId = event.target.value
                  const firstType = data.inspectionTypes.find((type) => type.serviceAreaId === serviceAreaId)
                  setScriptForm({ ...scriptForm, serviceAreaId, inspectionTypeId: firstType?.id ?? '' })
                }}
              >
                {data.serviceAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tipo de vistoria">
              <select className={inputClass} value={scriptForm.inspectionTypeId} onChange={(event) => setScriptForm({ ...scriptForm, inspectionTypeId: event.target.value })}>
                {availableTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nome do roteiro">
              <input className={inputClass} value={scriptForm.name} onChange={(event) => setScriptForm({ ...scriptForm, name: event.target.value })} />
            </Field>
            <Field label="Descricao">
              <textarea className={clsx(inputClass, 'min-h-24')} value={scriptForm.description} onChange={(event) => setScriptForm({ ...scriptForm, description: event.target.value })} />
            </Field>
            <button type="button" disabled={!canEdit} onClick={saveScript} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
              {scriptForm.id ? 'Salvar roteiro' : 'Adicionar roteiro'}
            </button>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <SectionTitle title="Roteiros cadastrados" description="Selecione um roteiro para configurar secoes e perguntas." />
          <div className="mt-5 space-y-3">
            {data.inspectionScripts.map((script) => (
              <button
                key={script.id}
                type="button"
                onClick={() => {
                  setSelectedScriptId(script.id)
                  setQuestionForm((previous) => ({ ...previous, sectionId: data.scriptSections.find((section) => section.scriptId === script.id)?.id ?? '' }))
                }}
                className={clsx('w-full rounded-2xl border p-4 text-left transition', selectedScript?.id === script.id ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50')}
              >
                <p className="font-bold text-slate-900">{script.name}</p>
                <p className="mt-1 text-sm text-slate-600">{maps.serviceAreas[script.serviceAreaId]?.name} • {maps.inspectionTypes[script.inspectionTypeId]?.name}</p>
                <p className="mt-2 text-xs text-slate-500">{script.description}</p>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle title={selectedScript?.name ?? 'Nenhum roteiro selecionado'} description="Organize secoes e perguntas do roteiro selecionado." />
          {selectedScript && (
            <div className="mt-5 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">Nova secao</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Titulo">
                    <input className={inputClass} value={sectionForm.title} onChange={(event) => setSectionForm({ ...sectionForm, title: event.target.value })} />
                  </Field>
                  <Field label="Descricao">
                    <input className={inputClass} value={sectionForm.description} onChange={(event) => setSectionForm({ ...sectionForm, description: event.target.value })} />
                  </Field>
                </div>
                <button type="button" disabled={!canEdit} onClick={saveSection} className="mt-4 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                  {sectionForm.id ? 'Salvar secao' : 'Adicionar secao'}
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-bold text-slate-900">Nova pergunta</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Secao">
                    <select className={inputClass} value={questionForm.sectionId} onChange={(event) => setQuestionForm({ ...questionForm, sectionId: event.target.value })}>
                      {selectedSections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.title}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Codigo">
                    <input className={inputClass} value={questionForm.code} onChange={(event) => setQuestionForm({ ...questionForm, code: event.target.value })} placeholder="Ex.: VS-001" />
                  </Field>
                  <Field label="Pergunta">
                    <input className={inputClass} value={questionForm.title} onChange={(event) => setQuestionForm({ ...questionForm, title: event.target.value })} />
                  </Field>
                  <Field label="Tipo de resposta">
                    <select className={inputClass} value={questionForm.responseType} onChange={(event) => setQuestionForm({ ...questionForm, responseType: event.target.value as QuestionResponseType })}>
                      {Object.entries(responseTypeLabels).map(([id, label]) => (
                        <option key={id} value={id}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Criticidade">
                    <select className={inputClass} value={questionForm.criticality} onChange={(event) => setQuestionForm({ ...questionForm, criticality: event.target.value as Criticality })}>
                      {(['Baixa', 'Media', 'Alta', 'Critica'] as Criticality[]).map((criticality) => (
                        <option key={criticality}>{criticality}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Prazo padrao para correcao">
                    <input className={inputClass} type="number" value={questionForm.defaultCorrectionDays} onChange={(event) => setQuestionForm({ ...questionForm, defaultCorrectionDays: event.target.value })} />
                  </Field>
                  <Field label="Opcoes, se houver">
                    <input className={inputClass} value={questionForm.optionsText} onChange={(event) => setQuestionForm({ ...questionForm, optionsText: event.target.value })} placeholder="Separar por virgula" />
                  </Field>
                  <Field label="Base legal">
                    <input className={inputClass} value={questionForm.legalReference} onChange={(event) => setQuestionForm({ ...questionForm, legalReference: event.target.value })} />
                  </Field>
                </div>
                <Field label="Orientacao ao fiscal">
                  <textarea className={clsx(inputClass, 'min-h-24')} value={questionForm.guidance} onChange={(event) => setQuestionForm({ ...questionForm, guidance: event.target.value })} />
                </Field>
                <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ['required', 'Obrigatoria'],
                    ['evidenceRequired', 'Exige evidencia'],
                    ['observationRequired', 'Exige observacao'],
                    ['autoCreateTicket', 'Gera chamado'],
                  ].map(([field, label]) => (
                    <label key={field} className="flex items-center gap-2 rounded-2xl border border-slate-200 p-3">
                      <input
                        type="checkbox"
                        checked={Boolean(questionForm[field as keyof typeof questionForm])}
                        onChange={(event) => setQuestionForm({ ...questionForm, [field]: event.target.checked })}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <button type="button" disabled={!canEdit || selectedSections.length === 0} onClick={saveQuestion} className="mt-4 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
                  {questionForm.id ? 'Salvar pergunta' : 'Adicionar pergunta'}
                </button>
              </div>

              <div className="space-y-4">
                {selectedSections.map((section) => (
                  <div key={section.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{section.order}. {section.title}</p>
                        <p className="text-sm text-slate-500">{section.description}</p>
                      </div>
                      <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold" disabled={!canEdit} onClick={() => setSectionForm(section)}>
                        Editar secao
                      </button>
                    </div>
                    <div className="mt-4 space-y-3">
                      {selectedQuestions
                        .filter((question) => question.sectionId === section.id)
                        .map((question) => (
                          <div key={question.id} className="rounded-2xl bg-slate-50 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={criticalityColors[question.criticality]}>{question.criticality}</Badge>
                              <Badge className="bg-blue-100 text-blue-700">{responseTypeLabels[question.responseType]}</Badge>
                              {question.evidenceRequired && <Badge className="bg-amber-100 text-amber-700">Evidencia obrigatoria</Badge>}
                            </div>
                            <p className="mt-3 font-bold">{question.code} - {question.title}</p>
                            <p className="mt-1 text-sm text-slate-600">{question.guidance}</p>
                            {question.legalReference && <p className="mt-2 text-xs font-semibold text-slate-500">Base legal: {question.legalReference}</p>}
                            <button
                              type="button"
                              className="mt-3 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
                              disabled={!canEdit}
                              onClick={() =>
                                setQuestionForm({
                                  id: question.id,
                                  sectionId: question.sectionId,
                                  code: question.code,
                                  title: question.title,
                                  guidance: question.guidance,
                                  responseType: question.responseType,
                                  optionsText: question.options.map((option) => option.label).join(', '),
                                  required: question.required,
                                  evidenceRequired: question.evidenceRequired,
                                  observationRequired: question.observationRequired,
                                  autoCreateTicket: question.autoCreateTicket,
                                  defaultCorrectionDays: String(question.defaultCorrectionDays ?? ''),
                                  criticality: question.criticality,
                                  legalReference: question.legalReference ?? '',
                                })
                              }
                            >
                              Editar pergunta
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function CitizenReportsAdmin({
  data,
  maps,
  currentUser,
  commit,
}: {
  data: AppData
  maps: AppMaps
  currentUser: User
  commit: (producer: (draft: AppData) => AppData, action: string, entity: string, entityId: string, description: string) => void
}) {
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [selectedId, setSelectedId] = useState(data.citizenReports[0]?.id ?? '')
  const [triageNote, setTriageNote] = useState('')
  const [assignedSectorId, setAssignedSectorId] = useState(data.sectors[0]?.id ?? '')
  const filtered = data.citizenReports.filter((report) => statusFilter === 'Todos' || report.status === statusFilter)
  const selected = data.citizenReports.find((report) => report.id === selectedId) ?? filtered[0]
  const selectedGroup = selected?.groupId ? data.citizenReportGroups.find((group) => group.id === selected.groupId) : undefined
  const groupedReports = selectedGroup ? data.citizenReports.filter((report) => selectedGroup.reportIds.includes(report.id)) : []
  const canTriage = ['admin', 'gestor'].includes(currentUser.role)

  const updateReportStatus = (report: CitizenReport, status: CitizenReportStatus, note: string) => {
    commit(
      (draft) => ({
        ...draft,
        citizenReports: draft.citizenReports.map((item) =>
          item.id === report.id
            ? {
                ...item,
                status,
                assignedSectorId: assignedSectorId || item.assignedSectorId,
                triageNotes: note || item.triageNotes,
                updatedAt: new Date().toISOString(),
                history: [
                  {
                    id: makeId('hist-den'),
                    at: new Date().toISOString(),
                    status,
                    note: note || `Denuncia atualizada para ${status}.`,
                    userId: currentUser.id,
                  },
                  ...item.history,
                ],
              }
            : item,
        ),
      }),
      'Atualizou denuncia',
      'denuncias',
      report.id,
      `${report.protocol} atualizada para ${status}.`,
    )
    setTriageNote('')
  }

  const createTicketFromReport = (report: CitizenReport) => {
    const team = data.teams.find((item) => item.sectorId === assignedSectorId) ?? data.teams[0]
    const ticket: Ticket = {
      id: makeId('ticket'),
      number: nextProtocol('CH', data.tickets.map((item) => item.number)),
      origin: 'Manual',
      locationId: data.locations[0]?.id ?? '',
      sectorId: assignedSectorId || (data.sectors[0]?.id ?? ''),
      categoryId: report.categoryId,
      description: `Denuncia ${report.protocol}: ${report.title}. ${report.description}`,
      priority: 'Media',
      teamId: team?.id ?? '',
      dueDate: defaultDueDate(),
      status: 'Aberto',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [
        {
          id: makeId('hist'),
          at: new Date().toISOString(),
          userId: currentUser.id,
          to: 'Aberto',
          note: `Chamado criado a partir da denuncia ${report.protocol}.`,
        },
      ],
      comments: [],
      attachments: [...report.attachments],
      completionEvidence: [],
    }

    commit(
      (draft) => ({
        ...draft,
        tickets: [ticket, ...draft.tickets],
        citizenReports: draft.citizenReports.map((item) =>
          item.id === report.id
            ? {
                ...item,
                status: 'Encaminhada',
                assignedSectorId: assignedSectorId || item.assignedSectorId,
                linkedTicketId: ticket.id,
                updatedAt: new Date().toISOString(),
                history: [
                  {
                    id: makeId('hist-den'),
                    at: new Date().toISOString(),
                    status: 'Encaminhada',
                    note: `Chamado ${ticket.number} criado para atendimento.`,
                    userId: currentUser.id,
                  },
                  ...item.history,
                ],
              }
            : item,
        ),
      }),
      'Criou chamado a partir de denuncia',
      'denuncias',
      report.id,
      `${ticket.number} criado a partir de ${report.protocol}.`,
    )
  }

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Portal do cidadao" title="Denuncias recebidas" description="Triagem de protocolos enviados pelo celular, com fotos e geolocalizacao." />
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={<AlertTriangle />} label="Recebidas" value={data.citizenReports.length} tone="blue" />
        <MetricCard icon={<Search />} label="Em triagem" value={data.citizenReports.filter((item) => item.status === 'Em triagem').length} tone="amber" />
        <MetricCard icon={<TicketCheck />} label="Encaminhadas" value={data.citizenReports.filter((item) => item.status === 'Encaminhada').length} tone="teal" />
        <MetricCard icon={<CheckCircle2 />} label="Casos agrupados" value={data.citizenReportGroups.length} tone="emerald" />
      </div>

      <Card>
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <Field label="Status">
            <select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {['Todos', 'Recebida', 'Em triagem', 'Encaminhada', 'Vistoria agendada', 'Concluida', 'Arquivada'].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </Field>
          <button type="button" className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold" onClick={() => setStatusFilter('Todos')}>
            Limpar filtros
          </button>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <SectionTitle title="Protocolos" description={`${filtered.length} denuncia(s) exibida(s).`} />
          <div className="mt-5 space-y-3">
            {filtered.length === 0 && <EmptyState title="Nenhuma denuncia encontrada" text="Nao ha protocolos para o filtro aplicado." />}
            {filtered.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => setSelectedId(report.id)}
                className={clsx('w-full rounded-2xl border p-4 text-left transition', selected?.id === report.id ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50')}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{report.protocol}</p>
                    <p className="mt-1 text-sm text-slate-700">{report.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{maps.serviceAreas[report.serviceAreaId ?? '']?.name} • {formatDate(report.createdAt)}</p>
                    {report.groupId && (
                      <p className="mt-1 text-xs font-semibold text-blue-700">
                        Grupo {data.citizenReportGroups.find((group) => group.id === report.groupId)?.number ?? 'em analise'} • {data.citizenReports.filter((item) => item.groupId === report.groupId).length} protocolo(s)
                      </p>
                    )}
                  </div>
                  <Badge className={citizenReportStatusColors[report.status]}>{report.status}</Badge>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          {selected ? (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.15em] text-slate-400">{selected.protocol}</p>
                  <h3 className="text-2xl font-black">{selected.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{maps.categories[selected.categoryId]?.name}</p>
                </div>
                <Badge className={citizenReportStatusColors[selected.status]}>{selected.status}</Badge>
              </div>

              <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">{selected.description}</p>
              {selectedGroup && (
                <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                  <p className="font-bold">Caso agrupado {selectedGroup.number}</p>
                  <p className="mt-1">
                    {groupedReports.length} denuncia(s) indicam problema semelhante em um raio aproximado de 150 metros.
                  </p>
                  <p className="mt-2 text-xs font-semibold">Motivo agrupado: {selectedGroup.title}</p>
                </div>
              )}
              <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
                <Info label="Endereco informado" value={selected.address || 'Nao informado'} />
                <Info label="Coordenadas" value={formatCoordinates(selected.coordinates)} />
                <Info label="Identificacao" value={selected.anonymous ? 'Anonima' : selected.citizenName} />
                <Info label="Contato" value={selected.anonymous ? 'Nao informado' : selected.citizenContact} />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {selected.attachments.map((attachment) => (
                  <div key={attachment.id} className="w-28 rounded-2xl border border-slate-200 bg-white p-2">
                    <img src={attachment.dataUrl} alt={attachment.name} className="h-20 w-full rounded-xl object-cover" />
                    <p className="mt-2 truncate text-[10px] text-slate-500">{attachment.name}</p>
                  </div>
                ))}
              </div>

              {groupedReports.length > 1 && (
                <div className="mt-6">
                  <p className="text-sm font-bold text-slate-900">Denuncias relacionadas</p>
                  <div className="mt-3 space-y-2">
                    {groupedReports.map((report) => (
                      <button
                        key={report.id}
                        type="button"
                        className={clsx('w-full rounded-2xl border p-3 text-left text-sm', report.id === selected.id ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white')}
                        onClick={() => setSelectedId(report.id)}
                      >
                        <p className="font-bold">{report.protocol}</p>
                        <p className="text-slate-600">{report.title}</p>
                        <p className="mt-1 text-xs text-slate-400">{formatDate(report.createdAt)} • {formatCoordinates(report.coordinates)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {canTriage && (
                <div className="mt-6 space-y-4">
                  <Field label="Setor de encaminhamento">
                    <select className={inputClass} value={assignedSectorId} onChange={(event) => setAssignedSectorId(event.target.value)}>
                      {data.sectors.map((sector) => (
                        <option key={sector.id} value={sector.id}>
                          {sector.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Observacao de triagem">
                    <textarea className={clsx(inputClass, 'min-h-24')} value={triageNote} onChange={(event) => setTriageNote(event.target.value)} />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton onClick={() => updateReportStatus(selected, 'Em triagem', triageNote || 'Denuncia colocada em triagem.')}>Iniciar triagem</ActionButton>
                    <ActionButton onClick={() => updateReportStatus(selected, 'Vistoria agendada', triageNote || 'Vistoria agendada para apuracao.')}>Agendar vistoria</ActionButton>
                    <ActionButton onClick={() => createTicketFromReport(selected)}>Criar chamado</ActionButton>
                    <ActionButton onClick={() => updateReportStatus(selected, 'Concluida', triageNote || 'Denuncia concluida.')}>Concluir</ActionButton>
                    <ActionButton onClick={() => updateReportStatus(selected, 'Arquivada', triageNote || 'Denuncia arquivada pela triagem.')}>Arquivar</ActionButton>
                  </div>
                </div>
              )}

              <div className="mt-6">
                <p className="text-sm font-bold text-slate-900">Historico do protocolo</p>
                <div className="mt-3 space-y-3">
                  {selected.history.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-slate-200 p-3 text-sm">
                      <p className="font-semibold">{entry.status}</p>
                      <p className="text-slate-600">{entry.note}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatDate(entry.at)}{entry.userId ? ` • ${maps.users[entry.userId]?.name}` : ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState title="Selecione uma denuncia" text="Use a lista para consultar dados, fotos e localizacao." />
          )}
        </Card>
      </div>
    </div>
  )
}

function Inspections({
  data,
  maps,
  currentUser,
  commit,
}: {
  data: AppData
  maps: AppMaps
  currentUser: User
  commit: (producer: (draft: AppData) => AppData, action: string, entity: string, entityId: string, description: string) => void
}) {
  const defaultScript = data.inspectionScripts.find((script) => script.active) ?? data.inspectionScripts[0]
  const [form, setForm] = useState({
    serviceAreaId: defaultScript?.serviceAreaId ?? data.serviceAreas[0]?.id ?? '',
    inspectionTypeId: defaultScript?.inspectionTypeId ?? data.inspectionTypes[0]?.id ?? '',
    scriptId: defaultScript?.id ?? '',
    sectorId: data.sectors[0]?.id ?? '',
    locationId: data.locations[0]?.id ?? '',
    categoryId: data.categories[0]?.id ?? '',
    generalNotes: '',
    coordinates: null as Coordinates | null,
  })
  const [formError, setFormError] = useState('')

  const selectedScript = data.inspectionScripts.find((script) => script.id === form.scriptId)
  const availableTypes = data.inspectionTypes.filter((type) => type.serviceAreaId === form.serviceAreaId)
  const availableScripts = data.inspectionScripts.filter((script) => script.active && script.serviceAreaId === form.serviceAreaId && script.inspectionTypeId === form.inspectionTypeId)
  const activeScriptQuestions = selectedScript
    ? data.scriptQuestions.filter((item) => item.active && item.scriptId === selectedScript.id).sort((a, b) => a.order - b.order)
    : []
  const activeChecklist = data.checklistItems.filter((item) => item.active && item.categoryId === form.categoryId)
  const activeInspectionItems = activeScriptQuestions.length > 0 ? activeScriptQuestions : activeChecklist
  const [answers, setAnswers] = useState<InspectionAnswer[]>(() =>
    activeInspectionItems.map((item) => ({ checklistItemId: item.id, status: 'conforme', notes: '', photos: [], openTicket: false })),
  )

  const getInspectionItem = (itemId: string) => {
    const scriptQuestion = data.scriptQuestions.find((item) => item.id === itemId)

    if (scriptQuestion) {
      return {
        title: scriptQuestion.title,
        required: scriptQuestion.required,
        guidance: scriptQuestion.guidance,
        evidenceRequired: scriptQuestion.evidenceRequired,
        autoCreateTicket: scriptQuestion.autoCreateTicket,
        defaultCorrectionDays: scriptQuestion.defaultCorrectionDays,
        criticality: scriptQuestion.criticality,
        legalReference: scriptQuestion.legalReference,
      }
    }

    const checklistItem = maps.checklistItems[itemId]
    return {
      title: checklistItem?.title ?? 'Nao conformidade',
      required: checklistItem?.required ?? false,
      guidance: '',
      evidenceRequired: true,
      autoCreateTicket: true,
      defaultCorrectionDays: 5,
      criticality: 'Alta' as Criticality,
      legalReference: undefined,
    }
  }

  const updateAnswer = (itemId: string, changes: Partial<InspectionAnswer>) => {
    setAnswers((previous) => previous.map((answer) => (answer.checklistItemId === itemId ? { ...answer, ...changes } : answer)))
  }

  const saveInspection = (status: Inspection['status']) => {
    if (!form.locationId || !form.sectorId || answers.length === 0) return
    if (status === 'Finalizada' && !form.coordinates) {
      setFormError('Informe a geolocalizacao da vistoria pelo mapa ou pelo GPS antes de finalizar.')
      return
    }
    const nonConformitiesWithoutPhoto = answers.filter((answer) => answer.status === 'nao_conforme' && getInspectionItem(answer.checklistItemId).evidenceRequired && answer.photos.length === 0)
    if (status === 'Finalizada' && nonConformitiesWithoutPhoto.length > 0) {
      setFormError('Toda nao conformidade precisa ter ao menos uma foto capturada pela camera.')
      return
    }
    setFormError('')
    const id = makeId('vis')
    const inspection: Inspection = {
      id,
      number: nextProtocol('VIS', data.inspections.map((item) => item.number)),
      createdAt: new Date().toISOString(),
      finalizedAt: status === 'Finalizada' ? new Date().toISOString() : undefined,
      inspectorId: currentUser.id,
      status,
      ...form,
      answers,
    }

    const nonConformingAnswers = status === 'Finalizada' ? answers.filter((answer) => answer.status === 'nao_conforme') : []
    const generatedNonConformities: NonConformity[] = nonConformingAnswers.map((answer, index) => {
      const inspectionItem = getInspectionItem(answer.checklistItemId)
      const team = data.teams.find((item) => item.sectorId === form.sectorId) ?? data.teams[0]
      const correctionDays = inspectionItem.defaultCorrectionDays ?? 5
      const number = nextProtocol('NC', [...data.nonConformities.map((item) => item.number), ...Array.from({ length: index }, (_, offset) => `NC-${new Date().getFullYear()}-${String(data.nonConformities.length + offset + 1).padStart(4, '0')}`)])

      return {
        id: makeId('nc'),
        number,
        inspectionId: id,
        checklistItemId: answer.checklistItemId,
        serviceAreaId: form.serviceAreaId,
        inspectionTypeId: form.inspectionTypeId,
        scriptId: form.scriptId,
        locationId: form.locationId,
        sectorId: form.sectorId,
        categoryId: form.categoryId,
        title: inspectionItem.title,
        description: answer.notes || 'Nao conformidade registrada sem observacoes adicionais.',
        criticality: inspectionItem.criticality,
        legalReference: inspectionItem.legalReference,
        dueDate: new Date(Date.now() + correctionDays * 86400000).toISOString(),
        status: 'Aberta',
        responsibleTeamId: team?.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUser.id,
        evidence: [...answer.photos],
        history: [
          {
            id: makeId('hist-nc'),
            at: new Date().toISOString(),
            userId: currentUser.id,
            to: 'Aberta',
            note: `Nao conformidade gerada automaticamente pela vistoria ${inspection.number}.`,
          },
        ],
      }
    })

    const generatedTickets: Ticket[] =
      status === 'Finalizada'
        ? nonConformingAnswers
            .filter((answer) => answer.openTicket && getInspectionItem(answer.checklistItemId).autoCreateTicket)
            .map((answer, index) => {
              const inspectionItem = getInspectionItem(answer.checklistItemId)
              const team = data.teams.find((item) => item.sectorId === form.sectorId) ?? data.teams[0]
              const ticketNumber = nextProtocol('CH', [...data.tickets.map((item) => item.number), ...Array.from({ length: index }, (_, offset) => `CH-${new Date().getFullYear()}-${String(data.tickets.length + offset + 1).padStart(4, '0')}`)])
              const correctionDays = inspectionItem.defaultCorrectionDays ?? 5
              return {
                id: makeId('ticket'),
                number: ticketNumber,
                origin: 'Vistoria',
                inspectionId: id,
                checklistItemId: answer.checklistItemId,
                locationId: form.locationId,
                sectorId: form.sectorId,
                categoryId: form.categoryId,
                description: `${inspectionItem.title}: ${answer.notes || 'Sem observacoes adicionais.'}`,
                priority: inspectionItem.criticality === 'Critica' ? 'Urgente' : inspectionItem.criticality === 'Alta' ? 'Alta' : inspectionItem.criticality === 'Media' ? 'Media' : 'Baixa',
                teamId: team?.id ?? '',
                dueDate: new Date(Date.now() + correctionDays * 86400000).toISOString(),
                status: 'Aberto',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                history: [
                  {
                    id: makeId('hist'),
                    at: new Date().toISOString(),
                    userId: currentUser.id,
                    to: 'Aberto',
                    note: `Chamado gerado automaticamente pela vistoria ${inspection.number}.`,
                  },
                ],
                comments: [],
                attachments: [...answer.photos],
                completionEvidence: [],
              }
            })
        : []

    commit(
      (draft) => ({
        ...draft,
        inspections: [inspection, ...draft.inspections],
        nonConformities: [...generatedNonConformities, ...draft.nonConformities],
        tickets: [...generatedTickets, ...draft.tickets],
        notifications: [
          ...generatedNonConformities.map((nonConformity) => ({
            id: makeId('notif'),
            title: 'Nova nao conformidade',
            message: `${nonConformity.number} foi registrada com prazo para ${dateOnly(nonConformity.dueDate)}.`,
            createdAt: new Date().toISOString(),
            read: false,
          })),
          ...generatedTickets.map((ticket) => ({
            id: makeId('notif'),
            title: 'Novo chamado atribuido',
            message: `${ticket.number} foi aberto a partir da vistoria ${inspection.number}.`,
            createdAt: new Date().toISOString(),
            read: false,
          })),
          ...draft.notifications,
        ],
      }),
      status === 'Finalizada' ? 'Finalizou vistoria' : 'Salvou rascunho',
      'vistorias',
      id,
      `${inspection.number} salva com ${generatedNonConformities.length} nao conformidade(s) e ${generatedTickets.length} chamado(s) gerado(s).`,
    )
    setForm({
      serviceAreaId: defaultScript?.serviceAreaId ?? data.serviceAreas[0]?.id ?? '',
      inspectionTypeId: defaultScript?.inspectionTypeId ?? data.inspectionTypes[0]?.id ?? '',
      scriptId: defaultScript?.id ?? '',
      sectorId: data.sectors[0]?.id ?? '',
      locationId: data.locations[0]?.id ?? '',
      categoryId: data.categories[0]?.id ?? '',
      generalNotes: '',
      coordinates: null,
    })
  }

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Fiscalizacao" title="Nova vistoria" description="Use o mapa para registrar a geolocalizacao, tire fotos em campo e gere chamados das nao conformidades." />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Area de servico">
              <select
                className={inputClass}
                value={form.serviceAreaId}
                onChange={(event) => {
                  const serviceAreaId = event.target.value
                  const firstType = data.inspectionTypes.find((type) => type.serviceAreaId === serviceAreaId)
                  const firstScript = firstType ? data.inspectionScripts.find((script) => script.serviceAreaId === serviceAreaId && script.inspectionTypeId === firstType.id) : undefined
                  const scriptQuestions = firstScript ? data.scriptQuestions.filter((item) => item.active && item.scriptId === firstScript.id).sort((a, b) => a.order - b.order) : []
                  setForm({ ...form, serviceAreaId, inspectionTypeId: firstType?.id ?? '', scriptId: firstScript?.id ?? '' })
                  setAnswers(scriptQuestions.map((item) => ({ checklistItemId: item.id, status: 'conforme', notes: '', photos: [], openTicket: item.autoCreateTicket })))
                }}
              >
                {data.serviceAreas.filter((area) => area.active).map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tipo de vistoria">
              <select
                className={inputClass}
                value={form.inspectionTypeId}
                onChange={(event) => {
                  const inspectionTypeId = event.target.value
                  const firstScript = data.inspectionScripts.find((script) => script.serviceAreaId === form.serviceAreaId && script.inspectionTypeId === inspectionTypeId)
                  const scriptQuestions = firstScript ? data.scriptQuestions.filter((item) => item.active && item.scriptId === firstScript.id).sort((a, b) => a.order - b.order) : []
                  setForm({ ...form, inspectionTypeId, scriptId: firstScript?.id ?? '' })
                  setAnswers(scriptQuestions.map((item) => ({ checklistItemId: item.id, status: 'conforme', notes: '', photos: [], openTicket: item.autoCreateTicket })))
                }}
              >
                {availableTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Roteiro de vistoria">
              <select
                className={inputClass}
                value={form.scriptId}
                onChange={(event) => {
                  const scriptId = event.target.value
                  const scriptQuestions = data.scriptQuestions.filter((item) => item.active && item.scriptId === scriptId).sort((a, b) => a.order - b.order)
                  setForm({ ...form, scriptId })
                  setAnswers(scriptQuestions.map((item) => ({ checklistItemId: item.id, status: 'conforme', notes: '', photos: [], openTicket: item.autoCreateTicket })))
                }}
              >
                {availableScripts.map((script) => (
                  <option key={script.id} value={script.id}>
                    {script.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Secretaria/setor">
              <select className={inputClass} value={form.sectorId} onChange={(event) => setForm({ ...form, sectorId: event.target.value })}>
                {data.sectors.map((sector) => (
                  <option key={sector.id} value={sector.id}>
                    {sector.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Local vistoriado">
              <select className={inputClass} value={form.locationId} onChange={(event) => setForm({ ...form, locationId: event.target.value })}>
                {data.locations.filter((location) => location.active).map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Categoria legada">
              <select
                className={inputClass}
                value={form.categoryId}
                onChange={(event) => {
                  const categoryId = event.target.value
                  const checklist = data.checklistItems.filter((item) => item.active && item.categoryId === categoryId)
                  setForm({ ...form, categoryId, scriptId: '' })
                  setAnswers(checklist.map((item) => ({ checklistItemId: item.id, status: 'conforme', notes: '', photos: [], openTicket: false })))
                }}
              >
                {data.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Responsavel">
              <input className={inputClass} value={currentUser.name} readOnly />
            </Field>
          </div>

          <div className="mt-6">
            <MapPicker value={form.coordinates} onChange={(coordinates) => setForm({ ...form, coordinates })} />
          </div>

          {formError && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{formError}</div>}

          <div className="mt-6 space-y-4">
            {activeInspectionItems.length === 0 && <EmptyState title="Roteiro vazio" text="Cadastre perguntas ativas para este roteiro ou selecione uma categoria legada com checklist." />}
            {selectedScript && (
              <div className="rounded-3xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                <p className="font-bold">{selectedScript.name}</p>
                <p className="mt-1">{selectedScript.description}</p>
              </div>
            )}
            {activeInspectionItems.map((item) => {
              const answer = answers.find((entry) => entry.checklistItemId === item.id)
              const itemMeta = getInspectionItem(item.id)
              const section = 'sectionId' in item ? maps.scriptSections[item.sectionId] : undefined
              return (
                <div key={item.id} className="rounded-3xl border border-slate-200 p-4">
                  <div className="flex flex-col justify-between gap-3 md:flex-row">
                    <div>
                      {section && <p className="mb-1 text-xs font-bold uppercase tracking-[0.15em] text-slate-400">{section.title}</p>}
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900">{itemMeta.title}</p>
                        {'criticality' in item && <Badge className={criticalityColors[item.criticality]}>{item.criticality}</Badge>}
                      </div>
                      <p className="text-sm text-slate-500">{itemMeta.required ? 'Item obrigatorio' : 'Item opcional'}</p>
                      {itemMeta.guidance && <p className="mt-2 text-sm text-slate-600">{itemMeta.guidance}</p>}
                      {itemMeta.legalReference && <p className="mt-2 text-xs font-semibold text-slate-500">Base legal: {itemMeta.legalReference}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(['conforme', 'nao_conforme', 'nao_aplica'] as InspectionItemStatus[]).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => updateAnswer(item.id, { status, openTicket: status === 'nao_conforme' ? answer?.openTicket ?? itemMeta.autoCreateTicket : false })}
                          className={clsx(
                            'rounded-2xl px-3 py-2 text-xs font-bold',
                            answer?.status === status ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                          )}
                        >
                          {status === 'conforme' ? 'Conforme' : status === 'nao_conforme' ? 'Nao conforme' : 'Nao se aplica'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    className={clsx(inputClass, 'mt-4 min-h-24')}
                    placeholder="Observacoes do item"
                    value={answer?.notes ?? ''}
                    onChange={(event) => updateAnswer(item.id, { notes: event.target.value })}
                  />
                  <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
                      <Camera size={16} />
                      Tirar foto com GPS
                      <input
                        className="hidden"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={async (event) => {
                          let photoCoordinates = form.coordinates
                          try {
                            photoCoordinates = await getCurrentCoordinates()
                          } catch {
                            setFormError('Nao foi possivel ler o GPS no momento da foto. A foto foi salva com a coordenada da vistoria.')
                          }
                          const files = await filesToAttachments(event.target.files, photoCoordinates)
                          updateAnswer(item.id, { photos: [...(answer?.photos ?? []), ...files] })
                          event.target.value = ''
                        }}
                      />
                    </label>
                    {itemMeta.evidenceRequired && <Badge className="bg-amber-100 text-amber-700">Evidencia obrigatoria quando houver nao conformidade</Badge>}
                    {answer?.status === 'nao_conforme' && (
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={answer.openTicket}
                          onChange={(event) => updateAnswer(item.id, { openTicket: event.target.checked })}
                        />
                        Abrir chamado vinculado
                      </label>
                    )}
                  </div>
                  {!!answer?.photos.length && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {answer.photos.map((photo) => (
                        <div key={photo.id} className="w-28 rounded-2xl border border-slate-200 bg-white p-2">
                          <img src={photo.dataUrl} alt={photo.name} className="h-20 w-full rounded-xl object-cover" />
                          <p className="mt-2 text-[10px] font-semibold leading-4 text-slate-500">{formatCoordinates(photo.coordinates)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <Field label="Observacao geral">
            <textarea className={clsx(inputClass, 'min-h-28')} value={form.generalNotes} onChange={(event) => setForm({ ...form, generalNotes: event.target.value })} />
          </Field>

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold" onClick={() => saveInspection('Rascunho')}>
              Salvar rascunho
            </button>
            <button type="button" className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white" onClick={() => saveInspection('Finalizada')}>
              Finalizar vistoria
            </button>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Vistorias recentes" description="Relatorio automatico pode ser impresso em Relatorios." />
          <div className="mt-5 space-y-3">
            {data.inspections.length === 0 && <EmptyState title="Nenhuma vistoria registrada" text="Finalize uma vistoria para acompanhar o historico." />}
            {data.inspections.slice(0, 8).map((inspection) => (
              <div key={inspection.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{inspection.number}</p>
                    <p className="text-sm text-slate-500">{maps.locations[inspection.locationId]?.name}</p>
                  </div>
                  <Badge className={inspection.status === 'Finalizada' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{inspection.status}</Badge>
                </div>
                <p className="mt-3 text-xs text-slate-500">{formatDate(inspection.createdAt)}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{formatCoordinates(inspection.coordinates)}</p>
                <p className="mt-2 text-sm text-slate-700">
                  {inspection.answers.filter((answer) => answer.status === 'nao_conforme').length} nao conformidade(s)
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function ActionPlans({
  data,
  maps,
  currentUser,
  commit,
}: {
  data: AppData
  maps: AppMaps
  currentUser: User
  commit: (producer: (draft: AppData) => AppData, action: string, entity: string, entityId: string, description: string) => void
}) {
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [criticalityFilter, setCriticalityFilter] = useState('Todas')
  const [selectedId, setSelectedId] = useState(data.nonConformities[0]?.id ?? '')
  const [note, setNote] = useState('')
  const filtered = data.nonConformities
    .map((item) => (isNonConformityOverdue(item) && item.status !== 'Vencida' ? { ...item, status: 'Vencida' as NonConformityStatus } : item))
    .filter((item) => {
      const matchesStatus = statusFilter === 'Todos' || item.status === statusFilter
      const matchesCriticality = criticalityFilter === 'Todas' || item.criticality === criticalityFilter
      return matchesStatus && matchesCriticality
    })
  const selected = data.nonConformities.find((item) => item.id === selectedId) ?? filtered[0]
  const canCorrect = ['admin', 'executor'].includes(currentUser.role)
  const canValidate = ['admin', 'gestor'].includes(currentUser.role)

  const changeStatus = (nonConformity: NonConformity, to: NonConformityStatus, statusNote: string) => {
    commit(
      (draft) => ({
        ...draft,
        nonConformities: draft.nonConformities.map((item) =>
          item.id === nonConformity.id
            ? {
                ...item,
                status: to,
                updatedAt: new Date().toISOString(),
                validationNotes: to === 'Validada' ? statusNote : item.validationNotes,
                history: [
                  {
                    id: makeId('hist-nc'),
                    at: new Date().toISOString(),
                    userId: currentUser.id,
                    from: item.status,
                    to,
                    note: statusNote,
                  },
                  ...item.history,
                ],
              }
            : item,
        ),
      }),
      'Atualizou plano de acao',
      'nao_conformidades',
      nonConformity.id,
      `${nonConformity.number} atualizado para ${to}.`,
    )
    setNote('')
  }

  const addEvidence = async (nonConformity: NonConformity, event: ChangeEvent<HTMLInputElement>) => {
    const files = await filesToAttachments(event.target.files)
    if (files.length === 0) return

    commit(
      (draft) => ({
        ...draft,
        nonConformities: draft.nonConformities.map((item) =>
          item.id === nonConformity.id
            ? {
                ...item,
                status: item.status === 'Aberta' ? 'Em adequacao' : item.status,
                updatedAt: new Date().toISOString(),
                evidence: [...item.evidence, ...files],
                history: [
                  {
                    id: makeId('hist-nc'),
                    at: new Date().toISOString(),
                    userId: currentUser.id,
                    from: item.status,
                    to: item.status === 'Aberta' ? 'Em adequacao' : item.status,
                    note: `${files.length} evidencia(s) adicionada(s).`,
                  },
                  ...item.history,
                ],
              }
            : item,
        ),
      }),
      'Adicionou evidencia',
      'nao_conformidades',
      nonConformity.id,
      `${files.length} evidencia(s) adicionada(s) em ${nonConformity.number}.`,
    )
    event.target.value = ''
  }

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Fiscalizacao" title="Planos de acao e nao conformidades" description="Acompanhe adequacoes, prazos, evidencias e validacao fiscal das nao conformidades." />
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={<AlertTriangle />} label="Nao conformidades" value={data.nonConformities.length} tone="rose" />
        <MetricCard icon={<CalendarClock />} label="Vencidas" value={data.nonConformities.filter(isNonConformityOverdue).length} tone="amber" />
        <MetricCard icon={<Camera />} label="Com evidencias" value={data.nonConformities.filter((item) => item.evidence.length > 0).length} tone="blue" />
        <MetricCard icon={<CheckCircle2 />} label="Validadas" value={data.nonConformities.filter((item) => item.status === 'Validada').length} tone="emerald" />
      </div>

      <Card>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Status">
            <select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {['Todos', 'Aberta', 'Em adequacao', 'Corrigida', 'Validada', 'Vencida', 'Cancelada'].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </Field>
          <Field label="Criticidade">
            <select className={inputClass} value={criticalityFilter} onChange={(event) => setCriticalityFilter(event.target.value)}>
              {['Todas', 'Baixa', 'Media', 'Alta', 'Critica'].map((criticality) => (
                <option key={criticality}>{criticality}</option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <button type="button" className="w-full rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold" onClick={() => { setStatusFilter('Todos'); setCriticalityFilter('Todas') }}>
              Limpar filtros
            </button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <SectionTitle title="Nao conformidades registradas" description={`${filtered.length} registro(s) exibido(s) de ${data.nonConformities.length}.`} />
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.14em] text-slate-400">
                  <th className="p-3">Numero</th>
                  <th className="p-3">Local</th>
                  <th className="p-3">Criticidade</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Prazo</th>
                  <th className="p-3">Acao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((nonConformity) => (
                  <tr key={nonConformity.id} className={clsx(isNonConformityOverdue(nonConformity) && 'bg-rose-50')}>
                    <td className="p-3 font-bold">{nonConformity.number}</td>
                    <td className="p-3">
                      <p className="font-semibold">{maps.locations[nonConformity.locationId]?.name}</p>
                      <p className="text-xs text-slate-500">{nonConformity.title}</p>
                    </td>
                    <td className="p-3"><Badge className={criticalityColors[nonConformity.criticality]}>{nonConformity.criticality}</Badge></td>
                    <td className="p-3"><Badge className={nonConformityStatusColors[isNonConformityOverdue(nonConformity) ? 'Vencida' : nonConformity.status]}>{isNonConformityOverdue(nonConformity) ? 'Vencida' : nonConformity.status}</Badge></td>
                    <td className="p-3">{dateOnly(nonConformity.dueDate)}</td>
                    <td className="p-3">
                      <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 font-semibold" onClick={() => setSelectedId(nonConformity.id)}>
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <EmptyState title="Nenhum registro encontrado" text="Nao ha nao conformidades para os filtros aplicados." />}
          </div>
        </Card>

        <Card>
          {selected ? (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.15em] text-slate-400">{maps.serviceAreas[selected.serviceAreaId ?? '']?.name ?? 'Area nao informada'}</p>
                  <h3 className="text-2xl font-black">{selected.number}</h3>
                  <p className="mt-1 text-sm text-slate-500">{maps.locations[selected.locationId]?.name}</p>
                </div>
                <Badge className={nonConformityStatusColors[isNonConformityOverdue(selected) ? 'Vencida' : selected.status]}>{isNonConformityOverdue(selected) ? 'Vencida' : selected.status}</Badge>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <Badge className={criticalityColors[selected.criticality]}>{selected.criticality}</Badge>
                <p className="mt-3 font-bold text-slate-900">{selected.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{selected.description}</p>
                {selected.legalReference && <p className="mt-3 text-xs font-semibold text-slate-500">Base legal: {selected.legalReference}</p>}
              </div>

              <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
                <Info label="Prazo" value={dateOnly(selected.dueDate)} />
                <Info label="Equipe responsavel" value={maps.teams[selected.responsibleTeamId ?? '']?.name} />
                <Info label="Setor" value={maps.sectors[selected.sectorId]?.name} />
                <Info label="Vistoria" value={data.inspections.find((inspection) => inspection.id === selected.inspectionId)?.number} />
              </div>

              <div className="mt-5 space-y-3">
                <Field label="Observacao da movimentacao">
                  <textarea className={clsx(inputClass, 'min-h-24')} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Descreva a correcao, validacao ou motivo da movimentacao." />
                </Field>
                <div className="flex flex-wrap gap-2">
                  {canCorrect && (
                    <>
                      <ActionButton onClick={() => changeStatus(selected, 'Em adequacao', note || 'Adequacao iniciada.')}>Iniciar adequacao</ActionButton>
                      <ActionButton onClick={() => changeStatus(selected, 'Corrigida', note || 'Correcao informada para validacao.')}>Marcar corrigida</ActionButton>
                    </>
                  )}
                  {canValidate && <ActionButton onClick={() => changeStatus(selected, 'Validada', note || 'Nao conformidade validada pelo fiscal.')}>Validar</ActionButton>}
                  {canValidate && <ActionButton onClick={() => changeStatus(selected, 'Cancelada', note || 'Nao conformidade cancelada.')}>Cancelar</ActionButton>}
                </div>
              </div>

              <div className="mt-6">
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
                  <Paperclip size={16} />
                  Anexar evidencia
                  <input className="hidden" type="file" multiple accept="image/*,.pdf" onChange={(event) => addEvidence(selected, event)} />
                </label>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selected.evidence.map((file) => (
                    <div key={file.id} className="w-28 rounded-2xl border border-slate-200 bg-white p-2">
                      {file.dataUrl.startsWith('data:image') ? <img src={file.dataUrl} alt={file.name} className="h-20 w-full rounded-xl object-cover" /> : <Paperclip className="mx-auto mt-5 text-slate-400" />}
                      <p className="mt-2 truncate text-[10px] font-semibold text-slate-500">{file.name}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm font-bold text-slate-900">Historico</p>
                <div className="mt-3 space-y-3">
                  {selected.history.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-slate-200 p-3 text-sm">
                      <p className="font-semibold">{entry.from ? `${entry.from} -> ${entry.to}` : entry.to}</p>
                      <p className="text-slate-600">{entry.note}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatDate(entry.at)} • {maps.users[entry.userId]?.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState title="Nenhuma nao conformidade" text="Finalize uma vistoria com itens nao conformes para gerar planos de acao." />
          )}
        </Card>
      </div>
    </div>
  )
}

function OfficialDocuments({
  data,
  maps,
  currentUser,
  commit,
}: {
  data: AppData
  maps: AppMaps
  currentUser: User
  commit: (producer: (draft: AppData) => AppData, action: string, entity: string, entityId: string, description: string) => void
}) {
  const [selectedDocumentId, setSelectedDocumentId] = useState(data.officialDocuments[0]?.id ?? '')
  const [sourceNonConformityId, setSourceNonConformityId] = useState(data.nonConformities[0]?.id ?? '')
  const [documentType, setDocumentType] = useState<OfficialDocumentType>('Auto de Infracao')
  const [signatureForm, setSignatureForm] = useState({ signerName: '', signerDocument: '', notes: '' })
  const selectedDocument = data.officialDocuments.find((document) => document.id === selectedDocumentId) ?? data.officialDocuments[0]
  const sourceNonConformity = data.nonConformities.find((item) => item.id === sourceNonConformityId)
  const canIssue = ['admin', 'gestor'].includes(currentUser.role)

  const createDocument = () => {
    if (!sourceNonConformity) return

    const now = new Date().toISOString()
    const inspection = data.inspections.find((item) => item.id === sourceNonConformity.inspectionId)
    const location = maps.locations[sourceNonConformity.locationId]
    const number = nextProtocol('DOC', data.officialDocuments.map((item) => item.number))
    const legalBasis = sourceNonConformity.legalReference || 'Legislacao municipal aplicavel e normas correlatas.'
    const document: OfficialDocument = {
      id: makeId('doc'),
      number,
      type: documentType,
      status: 'Gerado',
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser.id,
      inspectionId: sourceNonConformity.inspectionId,
      nonConformityId: sourceNonConformity.id,
      locationId: sourceNonConformity.locationId,
      serviceAreaId: sourceNonConformity.serviceAreaId,
      title: `${documentType} - ${sourceNonConformity.title}`,
      facts: `Durante a vistoria ${inspection?.number ?? sourceNonConformity.inspectionId}, realizada em ${location?.name ?? 'local informado'}, foi constatada a seguinte irregularidade: ${sourceNonConformity.description}`,
      legalBasis,
      measures:
        documentType === 'Auto de Infracao'
          ? 'Lavrar auto de infracao, concedendo prazo legal para defesa e providencias cabiveis.'
          : documentType === 'Interdicao'
            ? 'Determinar interdicao cautelar ate saneamento do risco identificado e posterior validacao fiscal.'
            : 'Notificar o responsavel para regularizacao dentro do prazo definido.',
      defenseDeadlineDays: documentType === 'Auto de Infracao' ? 15 : undefined,
      regularizationDeadlineDays: Math.max(1, Math.ceil((new Date(sourceNonConformity.dueDate).getTime() - Date.now()) / 86400000)),
      penalty: documentType === 'Auto de Infracao' ? 'Advertencia, multa e demais penalidades previstas na legislacao aplicavel.' : undefined,
      coordinates: inspection?.coordinates ?? undefined,
      signatures: [
        {
          id: makeId('assinatura'),
          signedAt: now,
          signerName: currentUser.name,
          signerRole: 'Fiscal',
          method: 'Sistema',
          notes: 'Documento emitido pelo fiscal responsavel no sistema.',
        },
      ],
      qrCodePayload: `${window.location.origin}/?documento=${number}`,
    }

    commit(
      (draft) => ({
        ...draft,
        officialDocuments: [document, ...draft.officialDocuments],
        notifications: [
          {
            id: makeId('notif'),
            title: 'Documento oficial gerado',
            message: `${document.number} foi gerado para ${sourceNonConformity.number}.`,
            createdAt: now,
            read: false,
          },
          ...draft.notifications,
        ],
      }),
      'Gerou documento oficial',
      'documentos',
      document.id,
      `${document.number} gerado a partir de ${sourceNonConformity.number}.`,
    )
    setSelectedDocumentId(document.id)
  }

  const signDocument = (document: OfficialDocument, refused = false) => {
    if (!signatureForm.signerName.trim() && !refused) return
    const now = new Date().toISOString()

    commit(
      (draft) => ({
        ...draft,
        officialDocuments: draft.officialDocuments.map((item) =>
          item.id === document.id
            ? {
                ...item,
                status: refused ? 'Recusado' : 'Assinado',
                updatedAt: now,
                signatures: [
                  {
                    id: makeId('assinatura'),
                    signedAt: now,
                    signerName: refused ? signatureForm.signerName || 'Responsavel recusou assinatura' : signatureForm.signerName,
                    signerDocument: signatureForm.signerDocument || undefined,
                    signerRole: 'Responsavel',
                    method: refused ? 'Recusa' : 'Tela',
                    notes: signatureForm.notes || (refused ? 'Responsavel recusou ciencia/assinatura.' : 'Ciencia registrada em tela.'),
                  },
                  ...item.signatures,
                ],
              }
            : item,
        ),
      }),
      refused ? 'Registrou recusa de assinatura' : 'Registrou assinatura',
      'documentos',
      document.id,
      `${document.number} atualizado com ${refused ? 'recusa' : 'assinatura'} do responsavel.`,
    )
    setSignatureForm({ signerName: '', signerDocument: '', notes: '' })
  }

  const markPrinted = (document: OfficialDocument) => {
    const now = new Date().toISOString()
    commit(
      (draft) => ({
        ...draft,
        officialDocuments: draft.officialDocuments.map((item) => (item.id === document.id ? { ...item, status: 'Impresso', printedAt: now, updatedAt: now } : item)),
      }),
      'Registrou impressao de documento',
      'documentos',
      document.id,
      `${document.number} marcado como impresso.`,
    )
    window.print()
  }

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Fiscalizacao" title="Documentos oficiais" description="Gere autos, notificacoes, interdicoes e relatorios vinculados a vistorias e nao conformidades." />

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <SectionTitle title="Emitir documento" description="Selecione uma nao conformidade e o tipo de documento oficial." />
          <div className="mt-5 space-y-4">
            <Field label="Nao conformidade">
              <select className={inputClass} value={sourceNonConformityId} onChange={(event) => setSourceNonConformityId(event.target.value)}>
                {data.nonConformities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.number} - {item.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tipo de documento">
              <select className={inputClass} value={documentType} onChange={(event) => setDocumentType(event.target.value as OfficialDocumentType)}>
                {(['Auto de Infracao', 'Notificacao', 'Interdicao', 'Apreensao', 'Embargo', 'Relatorio de Vistoria'] as OfficialDocumentType[]).map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </Field>
            <button type="button" disabled={!canIssue || !sourceNonConformity} onClick={createDocument} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
              Gerar documento
            </button>
          </div>

          <div className="mt-6 space-y-3">
            <p className="text-sm font-bold text-slate-900">Documentos recentes</p>
            {data.officialDocuments.length === 0 && <EmptyState title="Nenhum documento emitido" text="Gere o primeiro documento a partir de uma nao conformidade." />}
            {data.officialDocuments.map((document) => (
              <button
                key={document.id}
                type="button"
                onClick={() => setSelectedDocumentId(document.id)}
                className={clsx('w-full rounded-2xl border p-4 text-left', selectedDocument?.id === document.id ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white')}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{document.number}</p>
                    <p className="text-sm text-slate-600">{document.type}</p>
                  </div>
                  <Badge className={officialDocumentStatusColors[document.status]}>{document.status}</Badge>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          {selectedDocument ? (
            <div>
              <div id="official-document-print" className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Prefeitura Municipal</p>
                    <h3 className="mt-1 text-2xl font-black">{selectedDocument.type}</h3>
                    <p className="text-sm font-semibold text-slate-500">{selectedDocument.number}</p>
                  </div>
                  <Badge className={officialDocumentStatusColors[selectedDocument.status]}>{selectedDocument.status}</Badge>
                </div>

                <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
                  <Info label="Area" value={maps.serviceAreas[selectedDocument.serviceAreaId ?? '']?.name} />
                  <Info label="Local" value={maps.locations[selectedDocument.locationId ?? '']?.name} />
                  <Info label="Data de emissao" value={formatDate(selectedDocument.createdAt)} />
                  <Info label="Coordenadas" value={formatCoordinates(selectedDocument.coordinates)} />
                </div>

                <div className="mt-5 space-y-4 text-sm leading-6 text-slate-700">
                  <div>
                    <p className="font-bold text-slate-950">Fatos constatados</p>
                    <p>{selectedDocument.facts}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-950">Base legal</p>
                    <p>{selectedDocument.legalBasis}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-950">Medidas adotadas</p>
                    <p>{selectedDocument.measures}</p>
                  </div>
                  {selectedDocument.defenseDeadlineDays && <p><strong>Prazo de defesa:</strong> {selectedDocument.defenseDeadlineDays} dias.</p>}
                  {selectedDocument.regularizationDeadlineDays && <p><strong>Prazo de regularizacao:</strong> {selectedDocument.regularizationDeadlineDays} dias.</p>}
                  {selectedDocument.penalty && <p><strong>Penalidade prevista:</strong> {selectedDocument.penalty}</p>}
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold">QR/Protocolo: {selectedDocument.qrCodePayload}</p>
                </div>

                <div className="mt-6 border-t border-slate-200 pt-4">
                  <p className="text-sm font-bold text-slate-900">Assinaturas e ciencia</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {selectedDocument.signatures.map((signature) => (
                      <div key={signature.id} className="rounded-2xl border border-slate-200 p-3 text-sm">
                        <p className="font-bold">{signature.signerName}</p>
                        <p className="text-slate-600">{signature.signerRole} • {signature.method}</p>
                        <p className="text-xs text-slate-400">{formatDate(signature.signedAt)}</p>
                        {signature.notes && <p className="mt-2 text-xs text-slate-600">{signature.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <SectionTitle title="Registrar ciencia do responsavel" description="Use para assinatura em tela simplificada ou registro de recusa." />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Nome do responsavel">
                    <input className={inputClass} value={signatureForm.signerName} onChange={(event) => setSignatureForm({ ...signatureForm, signerName: event.target.value })} />
                  </Field>
                  <Field label="CPF/CNPJ ou documento">
                    <input className={inputClass} value={signatureForm.signerDocument} onChange={(event) => setSignatureForm({ ...signatureForm, signerDocument: event.target.value })} />
                  </Field>
                </div>
                <Field label="Observacao">
                  <textarea className={clsx(inputClass, 'min-h-20')} value={signatureForm.notes} onChange={(event) => setSignatureForm({ ...signatureForm, notes: event.target.value })} />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <ActionButton onClick={() => signDocument(selectedDocument)}>Registrar assinatura</ActionButton>
                  <ActionButton onClick={() => signDocument(selectedDocument, true)}>Registrar recusa</ActionButton>
                  <ActionButton onClick={() => markPrinted(selectedDocument)}>Imprimir</ActionButton>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState title="Nenhum documento selecionado" text="Gere ou selecione um documento oficial para visualizar." />
          )}
        </Card>
      </div>
    </div>
  )
}

function Tickets({
  data,
  maps,
  currentUser,
  commit,
  query,
  setQuery,
}: {
  data: AppData
  maps: AppMaps
  currentUser: User
  commit: (producer: (draft: AppData) => AppData, action: string, entity: string, entityId: string, description: string) => void
  query: string
  setQuery: (query: string) => void
}) {
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [selectedTicketId, setSelectedTicketId] = useState(data.tickets[0]?.id ?? '')
  const [comment, setComment] = useState('')
  const [manualForm, setManualForm] = useState(() => ({
    locationId: data.locations[0]?.id ?? '',
    sectorId: data.sectors[0]?.id ?? '',
    categoryId: data.categories[0]?.id ?? '',
    description: '',
    priority: 'Media' as Priority,
    teamId: data.teams[0]?.id ?? '',
    dueDate: defaultDueDate(),
  }))

  const filteredTickets = data.tickets.filter((ticket) => {
    const matchesStatus = statusFilter === 'Todos' || ticket.status === statusFilter
    const haystack = [ticket.number, ticket.description, maps.locations[ticket.locationId]?.name, maps.sectors[ticket.sectorId]?.name].join(' ').toLowerCase()
    return matchesStatus && haystack.includes(query.toLowerCase())
  })
  const selectedTicket = data.tickets.find((ticket) => ticket.id === selectedTicketId) ?? filteredTickets[0]
  const canCreate = ['admin', 'gestor'].includes(currentUser.role)
  const canExecute = ['admin', 'executor'].includes(currentUser.role)
  const canValidate = ['admin', 'gestor'].includes(currentUser.role)

  const changeStatus = (ticket: Ticket, to: TicketStatus, note: string) => {
    commit(
      (draft) => ({
        ...draft,
        tickets: draft.tickets.map((entry) =>
          entry.id === ticket.id
            ? {
                ...entry,
                status: to,
                updatedAt: new Date().toISOString(),
                completedAt: to === 'Concluido' ? new Date().toISOString() : entry.completedAt,
                validatedAt: to === 'Validado' ? new Date().toISOString() : entry.validatedAt,
                history: [
                  {
                    id: makeId('hist'),
                    at: new Date().toISOString(),
                    userId: currentUser.id,
                    from: entry.status,
                    to,
                    note,
                  },
                  ...entry.history,
                ],
              }
            : entry,
        ),
      }),
      'Movimentou chamado',
      'chamados',
      ticket.id,
      `${ticket.number}: ${ticket.status} -> ${to}.`,
    )
  }

  const createManualTicket = () => {
    if (!manualForm.description.trim()) return
    const id = makeId('ticket')
    const ticket: Ticket = {
      id,
      number: nextProtocol('CH', data.tickets.map((item) => item.number)),
      origin: 'Manual',
      ...manualForm,
      dueDate: new Date(`${manualForm.dueDate}T18:00:00`).toISOString(),
      status: 'Aberto',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [{ id: makeId('hist'), at: new Date().toISOString(), userId: currentUser.id, to: 'Aberto', note: 'Chamado aberto manualmente.' }],
      comments: [],
      attachments: [],
      completionEvidence: [],
    }
    commit(
      (draft) => ({
        ...draft,
        tickets: [ticket, ...draft.tickets],
        notifications: [
          {
            id: makeId('notif'),
            title: 'Novo chamado atribuido',
            message: `${ticket.number} foi atribuido para ${maps.teams[ticket.teamId]?.name ?? 'uma equipe'}.`,
            createdAt: new Date().toISOString(),
            read: false,
          },
          ...draft.notifications,
        ],
      }),
      'Criou chamado',
      'chamados',
      id,
      `${ticket.number} criado manualmente.`,
    )
    setSelectedTicketId(id)
    setManualForm({ ...manualForm, description: '' })
  }

  const addFiles = async (ticket: Ticket, field: 'attachments' | 'completionEvidence', event: ChangeEvent<HTMLInputElement>) => {
    const files = await filesToAttachments(event.target.files)
    commit(
      (draft) => ({
        ...draft,
        tickets: draft.tickets.map((entry) => (entry.id === ticket.id ? { ...entry, [field]: [...entry[field], ...files], updatedAt: new Date().toISOString() } : entry)),
      }),
      'Anexou arquivo',
      'chamados',
      ticket.id,
      `${files.length} anexo(s) incluidos em ${ticket.number}.`,
    )
  }

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Operacao" title="Chamados" description="Acompanhe o fluxo desde a abertura ate a validacao final pelo fiscal." />

      {canCreate && (
        <Card>
          <SectionTitle title="Abrir chamado manual" />
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Field label="Local">
              <select className={inputClass} value={manualForm.locationId} onChange={(event) => setManualForm({ ...manualForm, locationId: event.target.value })}>
                {data.locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Setor">
              <select className={inputClass} value={manualForm.sectorId} onChange={(event) => setManualForm({ ...manualForm, sectorId: event.target.value })}>
                {data.sectors.map((sector) => (
                  <option key={sector.id} value={sector.id}>
                    {sector.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Categoria">
              <select className={inputClass} value={manualForm.categoryId} onChange={(event) => setManualForm({ ...manualForm, categoryId: event.target.value })}>
                {data.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Prioridade">
              <select className={inputClass} value={manualForm.priority} onChange={(event) => setManualForm({ ...manualForm, priority: event.target.value as Priority })}>
                {(['Baixa', 'Media', 'Alta', 'Urgente'] as Priority[]).map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </select>
            </Field>
            <Field label="Equipe responsavel">
              <select className={inputClass} value={manualForm.teamId} onChange={(event) => setManualForm({ ...manualForm, teamId: event.target.value })}>
                {data.teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Prazo/SLA">
              <input className={inputClass} type="date" value={manualForm.dueDate} onChange={(event) => setManualForm({ ...manualForm, dueDate: event.target.value })} />
            </Field>
          </div>
          <Field label="Descricao do problema">
            <textarea className={clsx(inputClass, 'min-h-24')} value={manualForm.description} onChange={(event) => setManualForm({ ...manualForm, description: event.target.value })} />
          </Field>
          <button type="button" className="mt-4 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white" onClick={createManualTicket}>
            Abrir chamado
          </button>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <SectionTitle title="Fila de chamados" />
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                <input className={clsx(inputClass, 'pl-10')} placeholder="Buscar" value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option>Todos</option>
                {Object.keys(statusColors).map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-3">Protocolo</th>
                  <th className="p-3">Local</th>
                  <th className="p-3">Prioridade</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Prazo</th>
                  <th className="p-3">Acao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className={clsx(isOverdue(ticket) && 'bg-rose-50')}>
                    <td className="p-3 font-bold">{ticket.number}</td>
                    <td className="p-3">{maps.locations[ticket.locationId]?.name}</td>
                    <td className="p-3">
                      <Badge className={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge className={statusColors[ticket.status]}>{ticket.status}</Badge>
                    </td>
                    <td className="p-3">{dateOnly(ticket.dueDate)}</td>
                    <td className="p-3">
                      <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 font-semibold" onClick={() => setSelectedTicketId(ticket.id)}>
                        <Eye size={15} />
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          {selectedTicket ? (
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.15em] text-slate-400">{selectedTicket.origin}</p>
                  <h3 className="text-2xl font-black">{selectedTicket.number}</h3>
                  <p className="mt-1 text-sm text-slate-500">{maps.locations[selectedTicket.locationId]?.name}</p>
                </div>
                <Badge className={statusColors[selectedTicket.status]}>{selectedTicket.status}</Badge>
              </div>
              {isOverdue(selectedTicket) && (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">Chamado vencido. Prazo: {dateOnly(selectedTicket.dueDate)}</div>
              )}
              <p className="mt-5 text-sm leading-6 text-slate-700">{selectedTicket.description}</p>
              <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
                <Info label="Setor" value={maps.sectors[selectedTicket.sectorId]?.name} />
                <Info label="Equipe" value={maps.teams[selectedTicket.teamId]?.name} />
                <Info label="Categoria" value={maps.categories[selectedTicket.categoryId]?.name} />
                <Info label="Criado em" value={formatDate(selectedTicket.createdAt)} />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {canExecute && selectedTicket.status === 'Aberto' && <ActionButton onClick={() => changeStatus(selectedTicket, 'Em analise', 'Chamado recebido para analise.')}>Receber/analisar</ActionButton>}
                {canExecute && ['Aberto', 'Em analise', 'Reaberto'].includes(selectedTicket.status) && (
                  <ActionButton onClick={() => changeStatus(selectedTicket, 'Em execucao', 'Execucao iniciada pela equipe responsavel.')}>Iniciar execucao</ActionButton>
                )}
                {canExecute && ['Aberto', 'Em analise', 'Em execucao'].includes(selectedTicket.status) && (
                  <ActionButton onClick={() => changeStatus(selectedTicket, 'Aguardando informacao', 'Solicitacao de informacao adicional enviada.')}>Solicitar informacao</ActionButton>
                )}
                {canExecute && ['Em execucao', 'Aguardando informacao'].includes(selectedTicket.status) && (
                  <ActionButton onClick={() => changeStatus(selectedTicket, 'Concluido', 'Servico concluido e enviado para validacao.')}>Marcar concluido</ActionButton>
                )}
                {canValidate && selectedTicket.status === 'Concluido' && <ActionButton onClick={() => changeStatus(selectedTicket, 'Validado', 'Conclusao validada pelo fiscal/gestor.')}>Validar</ActionButton>}
                {canValidate && selectedTicket.status === 'Concluido' && <ActionButton onClick={() => changeStatus(selectedTicket, 'Reaberto', 'Reaberto por inconformidade na validacao final.')}>Reabrir</ActionButton>}
                {canValidate && !['Validado', 'Cancelado'].includes(selectedTicket.status) && <ActionButton onClick={() => changeStatus(selectedTicket, 'Cancelado', 'Chamado cancelado pela gestao.')}>Cancelar</ActionButton>}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold">
                  <Paperclip size={16} />
                  Anexos/fotos
                  <input className="hidden" type="file" accept="image/*" multiple onChange={(event) => addFiles(selectedTicket, 'attachments', event)} />
                </label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold">
                  <CheckCircle2 size={16} />
                  Evidencia de conclusao
                  <input className="hidden" type="file" accept="image/*" multiple onChange={(event) => addFiles(selectedTicket, 'completionEvidence', event)} />
                </label>
              </div>

              <div className="mt-5">
                <Field label="Comentario">
                  <textarea className={clsx(inputClass, 'min-h-20')} value={comment} onChange={(event) => setComment(event.target.value)} />
                </Field>
                <button
                  type="button"
                  className="mt-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold"
                  onClick={() => {
                    if (!comment.trim()) return
                    commit(
                      (draft) => ({
                        ...draft,
                        tickets: draft.tickets.map((ticket) =>
                          ticket.id === selectedTicket.id
                            ? { ...ticket, comments: [{ id: makeId('comment'), at: new Date().toISOString(), userId: currentUser.id, text: comment }, ...ticket.comments] }
                            : ticket,
                        ),
                      }),
                      'Comentou chamado',
                      'chamados',
                      selectedTicket.id,
                      `Comentario adicionado em ${selectedTicket.number}.`,
                    )
                    setComment('')
                  }}
                >
                  Adicionar comentario
                </button>
              </div>

              <div className="mt-6">
                <h4 className="font-bold">Historico</h4>
                <div className="mt-3 space-y-3">
                  {selectedTicket.history.map((history) => (
                    <div key={history.id} className="rounded-2xl bg-slate-50 p-3 text-sm">
                      <p className="font-semibold">
                        {history.from ? `${history.from} -> ` : ''}
                        {history.to}
                      </p>
                      <p className="text-slate-600">{history.note}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatDate(history.at)} por {maps.users[history.userId]?.name}
                      </p>
                    </div>
                  ))}
                  {selectedTicket.comments.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 p-3 text-sm">
                      <p className="text-slate-700">{item.text}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatDate(item.at)} por {maps.users[item.userId]?.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState title="Selecione um chamado" text="Use a lista para visualizar detalhes e movimentacoes." />
          )}
        </Card>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-800">{value || '-'}</p>
    </div>
  )
}

function ActionButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800" onClick={onClick}>
      {children}
    </button>
  )
}

function PrintSettings() {
  const [selectedPresetId, setSelectedPresetId] = useState<PrinterPresetId>(() => (window.localStorage.getItem('printer-preset-id') as PrinterPresetId | null) ?? 'generic-ffe0')
  const [status, setStatus] = useState<'idle' | 'printing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('Nenhuma impressora conectada nesta sessao.')
  const selectedPreset = printerPresets.find((preset) => preset.id === selectedPresetId) ?? printerPresets[0]
  const bluetoothSupported = isBluetoothPrintSupported()

  const updatePreset = (presetId: PrinterPresetId) => {
    setSelectedPresetId(presetId)
    window.localStorage.setItem('printer-preset-id', presetId)
  }

  const testPrint = async () => {
    setStatus('printing')
    setMessage('Solicitando permissao Bluetooth e conectando na impressora...')

    try {
      const printerName = await printEscPosTestPage(selectedPreset)
      setStatus('success')
      setMessage(`Teste enviado para ${printerName}.`)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Nao foi possivel imprimir pelo Bluetooth.')
    }
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Dispositivos de campo"
        title="Impressao Bluetooth"
        description="Conecte uma impressora termica compativel para testar a emissao de documentos oficiais pelo PWA."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Card>
          <SectionTitle title="Configurar impressora" description="A conexao Bluetooth direta funciona em navegadores compativeis, principalmente Chrome no Android, em ambiente HTTPS ou PWA instalado." />
          <div className="mt-5 space-y-4">
            <Field label="Perfil da impressora">
              <select className={inputClass} value={selectedPresetId} onChange={(event) => updatePreset(event.target.value as PrinterPresetId)}>
                {printerPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-bold text-slate-900">{selectedPreset.name}</p>
              <p className="mt-1">{selectedPreset.description}</p>
              <p className="mt-3 text-xs">
                Service UUID: <span className="font-mono">{selectedPreset.serviceUuid}</span>
              </p>
              <p className="mt-1 text-xs">
                Characteristic UUID: <span className="font-mono">{selectedPreset.characteristicUuid}</span>
              </p>
            </div>

            {!bluetoothSupported && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                Este navegador nao permite conexao Bluetooth direta. Use Chrome no Android ou gere PDF/impressao padrao pelo navegador.
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button type="button" disabled={!bluetoothSupported || status === 'printing'} onClick={testPrint} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
                {status === 'printing' ? 'Imprimindo...' : 'Conectar e imprimir teste'}
              </button>
              <button type="button" onClick={() => window.print()} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold">
                Impressao do navegador
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Status" description="Use esta area para validar a impressora antes de emitir autos e termos em campo." />
          <div
            className={clsx(
              'mt-5 rounded-2xl border p-4 text-sm font-semibold',
              status === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
              status === 'error' && 'border-rose-200 bg-rose-50 text-rose-700',
              status === 'printing' && 'border-sky-200 bg-sky-50 text-sky-900',
              status === 'idle' && 'border-slate-200 bg-slate-50 text-slate-600',
            )}
          >
            {message}
          </div>

          <div className="mt-5 space-y-3 text-sm text-slate-600">
            <p className="font-bold text-slate-900">Proximos passos planejados</p>
            <p>1. Gerar Auto de Infracao em HTML/PDF a partir da vistoria.</p>
            <p>2. Capturar assinatura do responsavel no proprio PWA.</p>
            <p>3. Imprimir o auto em ESC/POS e registrar data, fiscal, localizacao e status.</p>
            <p>4. Salvar ciencia, recusa de assinatura ou falha de impressao no historico.</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

function Reports({ data, maps }: { data: AppData; maps: AppMaps }) {
  const exportCsv = () => {
    const rows = [
      ['Protocolo', 'Origem', 'Local', 'Setor', 'Prioridade', 'Status', 'Prazo', 'Descricao'],
      ...data.tickets.map((ticket) => [
        ticket.number,
        ticket.origin,
        maps.locations[ticket.locationId]?.name ?? '',
        maps.sectors[ticket.sectorId]?.name ?? '',
        ticket.priority,
        ticket.status,
        dateOnly(ticket.dueDate),
        ticket.description.replace(/\n/g, ' '),
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'relatorio-chamados.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const reportCards = [
    { title: 'Relatorio de vistoria', text: 'Resumo por protocolo, local, checklist e nao conformidades.' },
    { title: 'Chamados por periodo', text: 'Exportacao CSV compativel com Excel.' },
    { title: 'Chamados vencidos', text: `${data.tickets.filter(isOverdue).length} chamado(s) fora do SLA.` },
    { title: 'Produtividade por equipe', text: 'Agrupamento por equipe responsavel e status final.' },
  ]

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Gestao" title="Relatorios" description="Exportacoes iniciais do MVP. A impressao do navegador atende o relatorio em PDF no prototipo." />
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">
          <Download size={16} />
          Exportar chamados CSV/Excel
        </button>
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold">
          <FileText size={16} />
          Imprimir/PDF
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {reportCards.map((card) => (
          <Card key={card.title}>
            <div className="mb-4 grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
              <FileText size={20} />
            </div>
            <h3 className="font-bold">{card.title}</h3>
            <p className="mt-2 text-sm text-slate-500">{card.text}</p>
          </Card>
        ))}
      </div>
      <Card>
        <SectionTitle title="Historico completo de chamados" />
        <div className="mt-4 space-y-3">
          {data.tickets.map((ticket) => (
            <div key={ticket.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold">{ticket.number}</p>
                  <p className="text-sm text-slate-500">{maps.locations[ticket.locationId]?.name}</p>
                </div>
                <Badge className={statusColors[ticket.status]}>{ticket.status}</Badge>
              </div>
              <p className="mt-3 text-sm text-slate-700">{ticket.description}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function Audit({ data, maps }: { data: AppData; maps: AppMaps }) {
  const pending = data.syncQueue.filter((item) => item.status === 'pending')
  const synced = data.syncQueue.filter((item) => item.status === 'synced')

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Governanca" title="Trilha de auditoria" description="Registro local das acoes relevantes realizadas no prototipo." />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={<WifiOff />} label="Pendentes no aparelho" value={pending.length} tone="amber" />
        <MetricCard icon={<Cloud />} label="Sincronizados" value={synced.length} tone="emerald" />
        <MetricCard icon={<Camera />} label="Fotos locais capturadas" value={data.inspections.reduce((total, inspection) => total + inspection.answers.reduce((sum, answer) => sum + answer.photos.length, 0), 0)} tone="blue" />
      </div>
      <Card>
        <SectionTitle title="Fila de sincronizacao" description="Os registros ficam salvos no aparelho e aguardam envio para a base principal quando houver internet." />
        <div className="mt-4 space-y-3">
          {data.syncQueue.length === 0 && <EmptyState title="Fila vazia" text="Novas vistorias, chamados e movimentacoes aparecerao aqui." />}
          {data.syncQueue.slice(0, 12).map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{item.action}</p>
                <Badge className={item.status === 'synced' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                  {item.status === 'synced' ? 'Sincronizado' : 'Pendente'}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {item.entity} • {item.entityId}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Criado em {formatDate(item.createdAt)}
                {item.syncedAt ? ` • sincronizado em ${formatDate(item.syncedAt)}` : ''}
              </p>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="space-y-3">
          {data.auditLogs.length === 0 && <EmptyState title="Sem eventos registrados" text="As acoes realizadas no sistema aparecerao aqui." />}
          {data.auditLogs.map((log) => (
            <div key={log.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{log.action}</p>
                <p className="text-xs text-slate-400">{formatDate(log.at)}</p>
              </div>
              <p className="mt-1 text-sm text-slate-600">{log.description}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                {maps.users[log.userId]?.name} • {log.entity}
              </p>
            </div>
          ))}
        </div>
      </Card>
      <button
        type="button"
        className="rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-bold text-rose-700"
        onClick={() => {
          resetData()
          resetRemoteData().finally(() => window.location.reload())
        }}
      >
        Restaurar dados mockados
      </button>
    </div>
  )
}

export default App
