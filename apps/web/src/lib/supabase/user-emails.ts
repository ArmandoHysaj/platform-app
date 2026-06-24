import { createClient } from './server'

interface UserEmailRow {
  id: string
  email: string | null
}

export async function getUserEmailMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[],
  currentUser: { id: string; email?: string | null }
) {
  const userEmails: Record<string, string> = {
    [currentUser.id]: currentUser.email ?? 'Unknown user',
  }
  const missingUserIds = userIds.filter((userId) => !userEmails[userId])

  if (missingUserIds.length === 0) {
    return userEmails
  }

  const { data } = await supabase.rpc('get_user_emails', {
    user_ids: missingUserIds,
  })

  if (Array.isArray(data)) {
    data.forEach((row: UserEmailRow) => {
      if (row.id && row.email) {
        userEmails[row.id] = row.email
      }
    })
  }

  return userEmails
}
