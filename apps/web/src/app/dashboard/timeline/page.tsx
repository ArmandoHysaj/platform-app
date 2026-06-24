import GenerateSummaryButton from '@/components/GenerateSummaryButton'
import { createClient } from '@/lib/supabase/server'
import type { ActivityEvent } from '@/lib/supabase/types'
import { getUserEmailMap } from '@/lib/supabase/user-emails'
import { formatActivityEvent, timeAgo } from '@/lib/utils'

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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Timeline</h2>
          <p className="mt-1 text-sm text-gray-500">
            Recent workspace activity across all work items.
          </p>
        </div>
        <GenerateSummaryButton />
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {events.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-500">No activity events yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {events.map((event) => (
              <div
                key={event.id}
                className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto_auto] md:items-center"
              >
                <p className="text-sm font-medium text-gray-900">
                  {formatActivityEvent(event)}
                </p>
                <p className="text-sm text-gray-500">
                  {event.changed_by_user_id
                    ? userEmails[event.changed_by_user_id] ?? 'Unknown user'
                    : 'System'}
                </p>
                <p className="text-sm text-gray-400">
                  {timeAgo(event.changed_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
