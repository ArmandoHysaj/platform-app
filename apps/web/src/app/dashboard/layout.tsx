import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from '@/components/SignOutButton'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="font-bold text-gray-900">Revido</h1>
            <div className="flex gap-4 text-sm">
              <a href="/dashboard" className="text-gray-600 hover:text-gray-900">
                Work Items
              </a>
              <a href="/dashboard/timeline" className="text-gray-600 hover:text-gray-900">
                Timeline
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
