import { initialData } from './mockData'
import type { AppData } from './types'

const STORAGE_KEY = 'prefeitura-vistorias-chamados'

export function loadData(): AppData {
  const stored = window.localStorage.getItem(STORAGE_KEY)

  if (!stored) {
    return initialData
  }

  try {
    return { ...initialData, ...JSON.parse(stored) } as AppData
  } catch {
    return initialData
  }
}

export function saveData(data: AppData) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export async function loadRemoteData(): Promise<AppData> {
  const response = await fetch('/api/app-data')

  if (!response.ok) {
    throw new Error('Nao foi possivel carregar os dados do servidor.')
  }

  const data = (await response.json()) as AppData
  saveData(data)
  return data
}

export async function saveRemoteData(data: AppData): Promise<AppData> {
  const response = await fetch('/api/app-data', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Nao foi possivel salvar os dados no servidor.')
  }

  return (await response.json()) as AppData
}

export function resetData() {
  window.localStorage.removeItem(STORAGE_KEY)
}

export async function resetRemoteData(): Promise<AppData> {
  const response = await fetch('/api/app-data/reset', {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('Nao foi possivel restaurar os dados no servidor.')
  }

  const data = (await response.json()) as AppData
  saveData(data)
  return data
}

export function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

export function nextProtocol(prefix: 'VIS' | 'CH', existingNumbers: string[]) {
  const year = new Date().getFullYear()
  const lastSequence = existingNumbers.reduce((highest, number) => {
    const match = number.match(new RegExp(`^${prefix}-${year}-(\\d{4})$`))
    return match ? Math.max(highest, Number(match[1])) : highest
  }, 0)

  return `${prefix}-${year}-${String(lastSequence + 1).padStart(4, '0')}`
}
