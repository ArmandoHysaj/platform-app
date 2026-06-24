import WorkItemsClient, {
  type WorkItemWithOwner,
} from '@/components/WorkItemsClient'
import { createClient } from '@/lib/supabase/server'
import type { WorkItem } from '@/lib/supabase/types'

interface UserEmailRow {
  id: string
  email: string | null
}

async function getOwnerEmailMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerIds: string[],
  currentUser: { id: string; email?: string | null }
) {
  const ownerEmails: Record<string, string> = {
    [currentUser.id]: currentUser.email ?? 'Unknown user',
  }
  const missingOwnerIds = ownerIds.filter((ownerId) => !ownerEmails[ownerId])

  if (missingOwnerIds.length === 0) {
    return ownerEmails
  }

  const { data } = await supabase.rpc('get_user_emails', {
    user_ids: missingOwnerIds,
  })

  if (Array.isArray(data)) {
    data.forEach((row: UserEmailRow) => {
      if (row.id && row.email) {
        ownerEmails[row.id] = row.email
      }
    })
  }

  return ownerEmails
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from('work_items')
    .select('id, title, description, owner_user_id, status, priority, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
        {error.message}
      </div>
    )
  }

  const workItems = (data ?? []) as WorkItem[]
  const ownerIds = Array.from(new Set(workItems.map((item) => item.owner_user_id)))
  const ownerEmails = await getOwnerEmailMap(supabase, ownerIds, user)
  const items: WorkItemWithOwner[] = workItems.map((item) => ({
    ...item,
    owner_email: ownerEmails[item.owner_user_id] ?? 'Unknown user',
  }))

  return (
    <WorkItemsClient
      initialItems={items}
      currentUser={{
        id: user.id,
        email: user.email ?? 'Unknown user',
      }}
    />
  )
}
