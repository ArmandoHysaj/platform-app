'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type {
  WorkItem,
  WorkItemPriority,
  WorkItemStatus,
} from '@/lib/supabase/types'
import {
  cn,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
} from '@/lib/utils'

export interface WorkItemWithOwner extends WorkItem {
  owner_email: string
}

interface WorkItemsClientProps {
  initialItems: WorkItemWithOwner[]
  currentUser: {
    id: string
    email: string
  }
}

interface WorkItemFormState {
  title: string
  description: string
  status: WorkItemStatus
  priority: WorkItemPriority
}

const STATUS_OPTIONS: WorkItemStatus[] = [
  'backlog',
  'in_progress',
  'blocked',
  'done',
]

const PRIORITY_OPTIONS: WorkItemPriority[] = [
  'low',
  'medium',
  'high',
  'urgent',
]

const EMPTY_FORM: WorkItemFormState = {
  title: '',
  description: '',
  status: 'backlog',
  priority: 'medium',
}

function Badge({
  children,
  className,
}: {
  children: React.ReactNode
  className: string
}) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-medium', className)}>
      {children}
    </span>
  )
}

function formatCreatedDate(dateString: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateString))
}

export default function WorkItemsClient({
  initialItems,
  currentUser,
}: WorkItemsClientProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState(initialItems)
  const [form, setForm] = useState<WorkItemFormState>(EMPTY_FORM)
  const [editingItem, setEditingItem] = useState<WorkItemWithOwner | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function openCreateForm() {
    setError(null)
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setIsFormOpen(true)
  }

  function openEditForm(item: WorkItemWithOwner) {
    setError(null)
    setEditingItem(item)
    setForm({
      title: item.title,
      description: item.description ?? '',
      status: item.status,
      priority: item.priority,
    })
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setError(null)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      owner_user_id: currentUser.id,
    }

    if (!payload.title) {
      setError('Title is required')
      setLoading(false)
      return
    }

    if (editingItem) {
      const { data, error } = await supabase
        .from('work_items')
        .update(payload)
        .eq('id', editingItem.id)
        .select()
        .single()

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const updatedItem = {
        ...data,
        owner_email: currentUser.email,
      } satisfies WorkItemWithOwner

      setItems((currentItems) =>
        currentItems.map((item) => item.id === updatedItem.id ? updatedItem : item)
      )
    } else {
      const { data, error } = await supabase
        .from('work_items')
        .insert(payload)
        .select()
        .single()

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const createdItem = {
        ...data,
        owner_email: currentUser.email,
      } satisfies WorkItemWithOwner

      setItems((currentItems) => [createdItem, ...currentItems])
    }

    setLoading(false)
    closeForm()
    router.refresh()
  }

  async function handleDelete(item: WorkItemWithOwner) {
    const confirmed = window.confirm(`Delete "${item.title}"?`)

    if (!confirmed) {
      return
    }

    setError(null)
    const { error } = await supabase
      .from('work_items')
      .delete()
      .eq('id', item.id)

    if (error) {
      setError(error.message)
      return
    }

    setItems((currentItems) =>
      currentItems.filter((currentItem) => currentItem.id !== item.id)
    )
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Work Items</h2>
          <p className="text-sm text-gray-500 mt-1">
            Track project work and status changes.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Create work item
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {isFormOpen && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">
              {editingItem ? 'Edit work item' : 'Create work item'}
            </h3>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    title: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a short title"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    description: event.target.value,
                  }))
                }
                className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional details"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    status: event.target.value as WorkItemStatus,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    priority: event.target.value as WorkItemPriority,
                  }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>
                    {PRIORITY_LABELS[priority]}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingItem ? 'Save changes' : 'Create item'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {items.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-500">No work items yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">{item.title}</div>
                      {item.description && (
                        <div className="mt-1 max-w-md text-sm text-gray-500">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={STATUS_COLORS[item.status]}>
                        {STATUS_LABELS[item.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={PRIORITY_COLORS[item.priority]}>
                        {PRIORITY_LABELS[item.priority]}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{item.owner_email}</td>
                    <td className="px-4 py-4 text-gray-600">
                      {formatCreatedDate(item.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(item)}
                          className="rounded-lg px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="rounded-lg px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
