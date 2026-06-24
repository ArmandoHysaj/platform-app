function normalizeSupabaseUrl(url: string): string {
  const trimmedUrl = url.trim()
  const protocolIndex = trimmedUrl.search(/https?:\/\//)

  if (protocolIndex >= 0) {
    return trimmedUrl.slice(protocolIndex)
  }

  return `https://${trimmedUrl}`
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return {
    url: normalizeSupabaseUrl(url),
    anonKey,
  }
}
