import 'dotenv/config'
import { serve } from '@hono/node-server'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

type ActivityEventRow = {
  id: string
  work_item_id: string
  field_changed: 'created' | 'status' | 'priority' | 'owner_user_id'
  old_value: string | null
  new_value: string | null
  changed_by_user_id: string | null
  changed_at: string
  work_items?: { title: string } | { title: string }[] | null
}

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  error?: {
    message?: string
  }
}

type OpenRouterSummaryResult =
  | { ok: true; summary: string; model: string }
  | { ok: false; error: string; status: number }

function loadLocalEnv() {
  const envPaths = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), 'apps/api/.env'),
  ]
  const envFile = envPaths
    .map((envPath) => {
      try {
        return readFileSync(envPath, 'utf8')
      } catch {
        return null
      }
    })
    .find((contents): contents is string => contents !== null)

  if (!envFile) {
    return
  }

  try {
    envFile
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .forEach((line) => {
        const index = line.indexOf('=')

        if (index === -1) {
          return
        }

        const key = line.slice(0, index)
        const value = line.slice(index + 1)

        process.env[key] ??= value
      })
  } catch {
    // Deployment environments provide real process env values.
  }
}

function getRequiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing ${name}`)
  }

  return value
}

function getWorkItemTitle(event: ActivityEventRow) {
  if (Array.isArray(event.work_items)) {
    return event.work_items[0]?.title ?? 'Unknown item'
  }

  return event.work_items?.title ?? 'Unknown item'
}

function formatPromptEvent(event: ActivityEventRow) {
  const itemTitle = getWorkItemTitle(event)
  const changedAt = new Date(event.changed_at).toISOString()

  switch (event.field_changed) {
    case 'created':
      return `${changedAt}: Created "${itemTitle}".`
    case 'status':
      return `${changedAt}: "${itemTitle}" status changed from ${event.old_value ?? 'empty'} to ${event.new_value ?? 'empty'}.`
    case 'priority':
      return `${changedAt}: "${itemTitle}" priority changed from ${event.old_value ?? 'empty'} to ${event.new_value ?? 'empty'}.`
    case 'owner_user_id':
      return `${changedAt}: "${itemTitle}" owner changed.`
    default:
      return `${changedAt}: "${itemTitle}" was updated.`
  }
}

function buildSummaryPrompt(events: ActivityEventRow[]) {
  const eventLines = events.map(formatPromptEvent).join('\n')

  return `Summarize the last 24 hours of project activity for a team lead.

Extract signal, not a list of events. Highlight what got done, anything blocked or urgent, capacity concerns, and patterns worth flagging to a team lead.

Write one short, direct paragraph in 3-5 sentences. Do not use bullet points.

Activity events:
${eventLines}`
}

async function requestOpenRouterSummary({
  apiKey,
  prompt,
}: {
  apiKey: string
  prompt: string
}): Promise<OpenRouterSummaryResult> {
  const models = [
    'meta-llama/llama-3.3-70b-instruct:free',
    process.env.OPENROUTER_FALLBACK_MODEL ?? 'openai/gpt-oss-20b:free',
  ]
  let lastError = 'OpenRouter summary generation failed.'
  let lastStatus = 502

  for (const model of models) {
    console.log(`Calling OpenRouter summary model: ${model}`)

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You write concise operational summaries for software team leads.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 220,
      }),
    })

    const result = await openRouterResponse.json() as OpenRouterResponse

    if (!openRouterResponse.ok) {
      const message = result.error?.message ?? openRouterResponse.statusText
      lastError = message
      lastStatus = openRouterResponse.status
      console.error('OpenRouter summary call failed', {
        model,
        status: openRouterResponse.status,
        message,
      })
      continue
    }

    const summary = result.choices?.[0]?.message?.content?.trim()

    if (!summary) {
      lastError = 'Summary generation returned no content.'
      lastStatus = 502
      console.error('OpenRouter summary call returned no content', { model })
      continue
    }

    return { ok: true, summary, model }
  }

  return { ok: false, error: lastError, status: lastStatus }
}

loadLocalEnv()

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

app.post('/summary', async (c) => {
  console.log('POST /summary hit', {
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY),
  })

  try {
    const supabaseUrl = getRequiredEnv('SUPABASE_URL')
    const supabaseServiceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
    const openRouterApiKey = getRequiredEnv('OPENROUTER_API_KEY')
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('activity_events')
      .select(`
        id,
        work_item_id,
        field_changed,
        old_value,
        new_value,
        changed_by_user_id,
        changed_at,
        work_items(title)
      `)
      .gte('changed_at', since)
      .order('changed_at', { ascending: false })

    if (error) {
      console.error('Supabase summary query failed', error.message)

      return c.json(
        { error: 'Could not load recent activity for the summary.' },
        500
      )
    }

    const events = (data ?? []) as ActivityEventRow[]

    if (events.length === 0) {
      return c.json({
        summary: 'No project activity was recorded in the last 24 hours.',
      })
    }

    console.log(`Preparing OpenRouter summary for ${events.length} events`)

    const summaryResult = await requestOpenRouterSummary({
      apiKey: openRouterApiKey,
      prompt: buildSummaryPrompt(events),
    })

    if (!summaryResult.ok) {
      return c.json(
        { error: `Summary generation failed: ${summaryResult.error}` },
        502
      )
    }

    console.log('OpenRouter summary generated', { model: summaryResult.model })

    return c.json({ summary: summaryResult.summary })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Summary route failed', message)

    return c.json(
      { error: `Could not generate summary: ${message}` },
      500
    )
  }
})

app.get('/', (c) => c.json({ message: 'Hono API running' }))

const port = parseInt(process.env.PORT ?? '3001')

serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on http://localhost:${port}`)
})

export default app
