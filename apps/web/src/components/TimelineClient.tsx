'use client'

import { useEffect, useMemo, useState } from 'react'
import GenerateSummaryButton from '@/components/GenerateSummaryButton'
import { createClient } from '@/lib/supabase/client'
import type { ActivityEvent } from '@/lib/supabase/types'
import { formatActivityEvent, timeAgo } from '@/lib/utils'

type ActivityEventRow = Omit<ActivityEvent, 'work_items'> & {
  work_items?: { title: string } | { title: string }[] | null
}

interface TimelineClientProps {
  initialEvents: ActivityEvent[]
  initialUserEmails: Record<string, string>
  currentUser: {
    id: string
    email: string
  }
}

interface UserEmailRow {
  id: string
  email: string | null
}

function normalizeActivityEvent(row: ActivityEventRow): ActivityEvent {
  return {
    ...row,
    work_items: Array.isArray(row.work_items)
      ? row.work_items[0] ?? null
      : row.work_items ?? null,
  }
}

export default function TimelineClient({
  initialEvents,
  initialUserEmails,
  currentUser,
}: TimelineClientProps) {
  const supabase = useMemo(() => createClient(), [])
  const [events, setEvents] = useState(initialEvents)
  const [userEmails, setUserEmails] = useState<Record<string, string>>({
    ...initialUserEmails,
    [currentUser.id]: currentUser.email,
  })

  useEffect(() => {
    async function fetchInsertedEvent(eventId: string) {
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
        .eq('id', eventId)
        .single()

      if (error || !data) {
        console.error('Could not load realtime activity event', error?.message)
        return
      }

      const nextEvent = normalizeActivityEvent(data as ActivityEventRow)

      setEvents((currentEvents) => {
        if (currentEvents.some((event) => event.id === nextEvent.id)) {
          return currentEvents
        }

        return [nextEvent, ...currentEvents]
      })

      const changedByUserId = nextEvent.changed_by_user_id

      if (!changedByUserId) {
        return
      }

      if (changedByUserId === currentUser.id) {
        setUserEmails((currentEmails) => ({
          ...currentEmails,
          [changedByUserId]: currentUser.email,
        }))
        return
      }

      const { data: emailRows } = await supabase.rpc('get_user_emails', {
        user_ids: [changedByUserId],
      })

      if (Array.isArray(emailRows)) {
        const row = (emailRows as UserEmailRow[]).find(
          (emailRow) => emailRow.id === changedByUserId
        )

        if (row?.email) {
          setUserEmails((currentEmails) => ({
            ...currentEmails,
            [changedByUserId]: row.email ?? 'Unknown user',
          }))
        }
      }
    }

    const channel = supabase
      .channel('activity-events-timeline')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_events',
        },
        (payload) => {
          const eventId = payload.new.id

          if (typeof eventId === 'string') {
            void fetchInsertedEvent(eventId)
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [currentUser.email, currentUser.id, supabase])

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
