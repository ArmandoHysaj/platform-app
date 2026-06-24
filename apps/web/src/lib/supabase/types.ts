export type WorkItemStatus = 'backlog' | 'in_progress' | 'blocked' | 'done'
export type WorkItemPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface WorkItem {
  id: string
  title: string
  description: string | null
  owner_user_id: string
  status: WorkItemStatus
  priority: WorkItemPriority
  created_at: string
  updated_at: string
}

export interface ActivityEvent {
  id: string
  work_item_id: string
  field_changed: 'created' | 'status' | 'priority' | 'owner_user_id'
  old_value: string | null
  new_value: string | null
  changed_by_user_id: string | null
  changed_at: string
  work_items?: { title: string } | null
}

export interface User {
  id: string
  email: string | undefined
}
