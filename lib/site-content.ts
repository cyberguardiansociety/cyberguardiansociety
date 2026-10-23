import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getManagedContentItems } from '@/lib/managed-content-store'
import { isSupabaseRuntimeConfigured } from '@/lib/supabase/config'

export type ManagedContentType = 'announcement' | 'product' | 'merchandise' | 'resource'

export type ManagedContentItem = {
  id: string
  content_type: ManagedContentType
  title: string
  slug: string
  summary: string
  body: string | null
  image_url: string | null
  action_url: string | null
  category: string | null
  status: 'draft' | 'published' | 'archived'
  sort_order: number
  created_at: string
  updated_at: string
}

export async function readPublicManagedContent(contentType: ManagedContentType): Promise<ManagedContentItem[]> {
  try {
    const supabase = await createSupabaseServerClient()
    return await getManagedContentItems(contentType, true, supabase)
  } catch (err) {
    console.warn('[site-content] Failed to read public content:', err)
    if (isSupabaseRuntimeConfigured()) throw err
    return await getManagedContentItems(contentType, true)
  }
}
