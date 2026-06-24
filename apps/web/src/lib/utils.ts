import { formatDistanceToNow } from 'date-fns'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ActivityEvent } from './supabase/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeAgo(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true })
}

export function formatActivityEvent(event: ActivityEvent): string {
  const time = timeAgo(event.changed_at)
  const itemTitle = event.work_items?.title ?? 'Unknown item'

  switch (event.field_changed) {
    case 'created':
      return `Created "${itemTitle}" - ${time}`
    case 'status':
      return `Changed status of "${itemTitle}" from ${event.old_value} to ${event.new_value} - ${time}`
    case 'priority':
      return `Changed priority of "${itemTitle}" from ${event.old_value} to ${event.new_value} - ${time}`
    case 'owner_user_id':
      return `Changed owner of "${itemTitle}" - ${time}`
    default:
      return `Updated "${itemTitle}" - ${time}`
  }
}

export const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  done: 'Done',
}

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export const STATUS_COLORS: Record<string, string> = {
  backlog: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  blocked: 'bg-red-100 text-red-700',
  done: 'bg-green-100 text-green-700',
}

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}
