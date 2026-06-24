import TimelineClient from '@/components/TimelineClient'
import { createClient } from '@/lib/supabase/server'
import type { ActivityEvent } from '@/lib/supabase/types'
import { getUserEmailMap } from '@/lib/supabase/user-emails'

type ActivityEventRow = Omit<ActivityEvent, 'work_items'> & {
  work_items?: { title: string } | { title: string }[] | null
}

function normalizeActivityEvent(row: ActivityEventRow): ActivityEvent {
  return {
    ...row,
    work_items: Array.isArray(row.work_items)
      ? row.work_items[0] ?? null
      : row.work_items ?? null,
  }
}

export default async function TimelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

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
    .order('changed_at', { ascending: false })

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
        {error.message}
      </div>
    )
  }

  const events = ((data ?? []) as ActivityEventRow[]).map(normalizeActivityEvent)
  const changedByIds = Array.from(
    new Set(
      events
        .map((event) => event.changed_by_user_id)
        .filter((userId): userId is string => Boolean(userId))
    )
  )
  const userEmails = await getUserEmailMap(supabase, changedByIds, user)

  return (
    <TimelineClient
      initialEvents={events}
      initialUserEmails={userEmails}
      currentUser={{
        id: user.id,
        email: user.email ?? 'Unknown user',
      }}
    />
  )
}
