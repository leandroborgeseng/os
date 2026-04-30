import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient } from '@prisma/client'
import { initialData } from '../src/mockData.js'
import type { AppData } from '../src/types.js'

const app = express()
const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/os?schema=public'
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
const clientDistPath = path.resolve(__dirname, '../../client')

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
  console.log(`Servidor iniciado na porta ${port}`)
})
