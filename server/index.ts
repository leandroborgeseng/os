import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient } from '@prisma/client'
import { initialData } from '../src/mockData.js'
import type { AppData } from '../src/types.js'

function buildDatabaseUrlFromPgVariables() {
  const host = process.env.PGHOST
  const port = process.env.PGPORT ?? '5432'
  const user = process.env.PGUSER
  const password = process.env.PGPASSWORD
  const database = process.env.PGDATABASE

  if (!host || !user || !password || !database) {
    return undefined
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}?schema=public`
}

function resolveDatabaseUrl() {
  const railwayFallback = process.env.RAILWAY_ENVIRONMENT ? undefined : 'postgresql://localhost:5432/os?schema=public'

  return (
    process.env.DATABASE_URL ??
    process.env.DATABASE_PRIVATE_URL ??
    process.env.POSTGRES_URL ??
    buildDatabaseUrlFromPgVariables() ??
    railwayFallback
  )
}

const app = express()
const connectionString = resolveDatabaseUrl()

if (!connectionString) {
  throw new Error('Configure a variavel DATABASE_URL com a URL do PostgreSQL antes de iniciar a aplicacao.')
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
})
const port = Number(process.env.PORT ?? 3001)
const appStateId = 'default'

app.use(express.json({ limit: '25mb' }))

function fromJson(data: Prisma.JsonValue): AppData {
  return data as unknown as AppData
}

function toJson(data: AppData): Prisma.InputJsonValue {
  return data as unknown as Prisma.InputJsonValue
}

async function getOrCreateAppData(): Promise<AppData> {
  const existing = await prisma.appState.findUnique({
    where: { id: appStateId },
  })

  if (existing) {
    return fromJson(existing.data)
  }

  const created = await prisma.appState.create({
    data: {
      id: appStateId,
      data: toJson(initialData),
    },
  })

  return fromJson(created.data)
}

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.get('/api/app-data', async (_request, response, next) => {
  try {
    response.json(await getOrCreateAppData())
  } catch (error) {
    next(error)
  }
})

app.put('/api/app-data', async (request, response, next) => {
  try {
    const data = request.body as AppData

    const updated = await prisma.appState.upsert({
      where: { id: appStateId },
      create: {
        id: appStateId,
        data: toJson(data),
      },
      update: {
        data: toJson(data),
      },
    })

    response.json(updated.data)
  } catch (error) {
    next(error)
  }
})

app.post('/api/app-data/reset', async (_request, response, next) => {
  try {
    const updated = await prisma.appState.upsert({
      where: { id: appStateId },
      create: {
        id: appStateId,
        data: toJson(initialData),
      },
      update: {
        data: toJson(initialData),
      },
    })

    response.json(updated.data)
  } catch (error) {
    next(error)
  }
})

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function resolveClientDistPath() {
  const fromModule = path.resolve(__dirname, '../../client')
  if (fs.existsSync(path.join(fromModule, 'index.html'))) {
    return fromModule
  }
  const fromCwd = path.join(process.cwd(), 'dist', 'client')
  if (fs.existsSync(path.join(fromCwd, 'index.html'))) {
    return fromCwd
  }
  console.warn(`[static] index.html nao encontrado em ${fromModule} nem em ${fromCwd}; usando ${fromModule}`)
  return fromModule
}

const clientDistPath = resolveClientDistPath()

app.use(express.static(clientDistPath))
app.get(/.*/, (_request, response) => {
  response.sendFile(path.join(clientDistPath, 'index.html'))
})

app.use((error: unknown, _request: express.Request, response: express.Response, next: express.NextFunction) => {
  void next
  console.error(error)
  response.status(500).json({ message: 'Nao foi possivel processar a solicitacao.' })
})

app.listen(port, () => {
  console.log(`Servidor iniciado na porta ${port} (static: ${clientDistPath})`)
})
