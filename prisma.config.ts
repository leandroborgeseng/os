import 'dotenv/config'
import { defineConfig } from 'prisma/config'

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

const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.DATABASE_PRIVATE_URL ??
  process.env.POSTGRES_URL ??
  buildDatabaseUrlFromPgVariables()

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
})
