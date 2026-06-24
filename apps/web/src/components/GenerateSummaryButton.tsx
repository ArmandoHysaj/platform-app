'use client'

import { useState } from 'react'

type SummaryResponse = {
  summary?: string
  error?: string
}

export default function GenerateSummaryButton() {
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleGenerateSummary() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL

    if (!apiUrl) {
      setError('Summary service is not configured.')
      return
    }

    setLoading(true)
    setError(null)
    setSummary(null)

    try {
      const response = await fetch(`${apiUrl}/summary`, {
        method: 'POST',
      })
      const data = await response.json() as SummaryResponse

      if (!response.ok || data.error) {
        throw new Error(data.error ?? 'Summary generation failed.')
      }

      if (!data.summary) {
        throw new Error('Summary generation returned no text.')
      }

      setSummary(data.summary)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.'
      setError(`Could not generate summary. ${message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-3 md:items-end">
      <button
        type="button"
        onClick={handleGenerateSummary}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Generate Summary'}
      </button>

      {summary && (
        <p className="max-w-xl rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
          {summary}
        </p>
      )}

      {error && (
        <p className="max-w-xl rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
