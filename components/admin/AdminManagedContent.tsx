import { requirePermission } from '@/lib/admin-auth'
import type { ManagedContentType } from '@/lib/site-content'
import { getManagedContentItems } from '@/lib/managed-content-store'
import AdminContentWorkspace from './AdminContentWorkspace'
import type { ContentRow } from './AdminContentWorkspace'

const config = {
  announcement: { permission: 'content_announcement' },
  product: { permission: 'content_product' },
  merchandise: { permission: 'content_merchandise' },
  resource: { permission: 'content_resource' },
} as const

export default async function AdminManagedContent({ type }: { type: ManagedContentType }) {
  const { supabase } = await requirePermission(config[type].permission)
  const items = await getManagedContentItems(type, false, supabase)

  const records: ContentRow[] = items.map((it) => ({
    id: it.id,
    title: it.title,
    slug: it.slug,
    summary: it.summary,
    body: it.body,
    image_url: it.image_url,
    action_url: it.action_url,
    category: it.category,
    status: it.status,
    sort_order: it.sort_order,
    updated_at: it.updated_at,
  }))

  return (
    <AdminContentWorkspace
      type={type}
      records={records}
      error={false}
    />
  )
}
