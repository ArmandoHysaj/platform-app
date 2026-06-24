import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('/*', cors({
  origin: ['http://localhost:3000', process.env.FRONTEND_URL ?? ''],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

app.get('/health', (c) => c.json({ 
  status: 'ok', 
  timestamp: new Date().toISOString() 
}))

app.get('/', (c) => c.json({ message: 'Hono API running' }))

const port = parseInt(process.env.PORT ?? '3001')

serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on http://localhost:${port}`)
})

export default app
