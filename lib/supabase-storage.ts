import fs from 'fs'
import path from 'path'
import { createHmac, randomUUID } from 'crypto'
import { getDerivedFileSigningSecret } from '@/lib/admin-config'
import { isSupabaseRuntimeConfigured } from '@/lib/supabase/config'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

/**
 * Local storage layer replacing Supabase Storage.
 *
 * - Public content images → `public/uploads/content/<kind>/<file>`
 *   (served statically by the web server).
 * - Private application files → `data/private/<path>` (never served
 *   statically; readable only through the signed `/api/admin/private-file`
 *   route).
 */

const PUBLIC_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads')
const PRIVATE_ROOT = path.join(process.cwd(), 'data', 'private')

const ALLOWED_CONTENT_KINDS = new Set(['announcement', 'product', 'merchandise', 'resource'])

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_PRIVATE_BYTES = 25 * 1024 * 1024

function validateImageMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false
  switch (mimeType) {
    case 'image/png':
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      )
    case 'image/jpeg':
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    case 'image/gif':
      return (
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38 &&
        (buffer[4] === 0x37 || buffer[4] === 0x39) &&
        buffer[5] === 0x61
      )
    case 'image/webp':
      return (
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
      )
    case 'image/avif': {
      const ftyp = buffer.subarray(4, 8).toString('ascii')
      const brand = buffer.subarray(8, 12).toString('ascii')
      return ftyp === 'ftyp' && (brand === 'avif' || brand === 'avis' || brand === 'mif1')
    }
    default:
      return false
  }
}

/** Rejects path traversal and absolute paths; returns a clean relative path. */
function sanitizeRelativePath(input: string): string | null {
  if (typeof input !== 'string' || input.length === 0 || input.length > 500) return null
  if (input.includes('\0')) return null
  const normalized = input.replace(/\\/g, '/').replace(/^\/+/, '')
  const segments = normalized.split('/')
  if (segments.some((segment) => segment === '..' || segment === '' || segment === '.')) {
    return null
  }
  return normalized
}

function resolvePrivatePath(relative: string): string | null {
  const safe = sanitizeRelativePath(relative)
  if (!safe) return null
  const full = path.resolve(PRIVATE_ROOT, safe)
  if (!full.startsWith(PRIVATE_ROOT + path.sep)) return null
  return full
}

export function isStorageConfigured(): boolean {
  if (isSupabaseRuntimeConfigured()) {
    return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  }
  try {
    fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true })
    fs.mkdirSync(PRIVATE_ROOT, { recursive: true })
    return true
  } catch {
    return false
  }
}

// ────────────────────────── Public content images ──────────────────────────

export type UploadImageResult = { ok: boolean; url?: string; error?: string }

export async function uploadPublicContentImage(
  kind: string,
  file: File,
): Promise<UploadImageResult> {
  try {
    if (!ALLOWED_CONTENT_KINDS.has(kind)) {
      return { ok: false, error: 'Unsupported content type for image upload.' }
    }
    if (!file) {
      return { ok: false, error: 'No image file was provided.' }
    }
    const type = (file.type || '').toLowerCase()
    const extension = IMAGE_EXTENSIONS[type]
    if (!extension) {
      return { ok: false, error: 'Unsupported image type. Use PNG, JPG, WebP, GIF or AVIF.' }
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.length === 0) {
      return { ok: false, error: 'The image file is empty.' }
    }
    if (buffer.length > MAX_IMAGE_BYTES) {
      return { ok: false, error: 'Image must be smaller than 5 MB.' }
    }
    if (!validateImageMagicBytes(buffer, type)) {
      return { ok: false, error: 'File contents do not match the specified image format.' }
    }

    const filename = `${randomUUID()}.${extension}`
    if (isSupabaseRuntimeConfigured()) {
      const storage = createSupabaseServiceClient().storage!.from('cgs-public-assets')
      const objectPath = `${kind}/${filename}`
      const { data, error } = await storage.upload(objectPath, buffer, { contentType: type, upsert: false })
      if (error || !data) return { ok: false, error: 'The image could not be stored.' }
      const { data: publicUrl } = storage.getPublicUrl(data.path)
      return { ok: true, url: publicUrl.publicUrl }
    }

    const dir = path.join(PUBLIC_UPLOADS_DIR, 'content', kind)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, filename), buffer)

    return { ok: true, url: `/uploads/content/${kind}/${filename}` }
  } catch (err) {
    console.error('[storage] Public image upload failed:', err)
    return { ok: false, error: 'The image could not be stored.' }
  }
}

// ────────────────────────── Private application files ──────────────────────────

export type UploadPrivateResult = { ok: boolean; path: string; error?: string }

export async function uploadPrivateObject(options: {
  path: string
  body: Uint8Array | ArrayBuffer | string
  contentType?: string
  upsert?: boolean
}): Promise<UploadPrivateResult> {
  try {
    const safe = sanitizeRelativePath(options.path)
    if (!safe) return { ok: false, path: options.path, error: 'Invalid storage path.' }

    const buffer = Buffer.isBuffer(options.body)
      ? options.body
      : Buffer.from(options.body as any)

    if (buffer.length > MAX_PRIVATE_BYTES) {
      return { ok: false, path: safe, error: 'The file exceeds the maximum allowed upload limit (25 MB).' }
    }

    if (isSupabaseRuntimeConfigured()) {
      const { error } = await createSupabaseServiceClient().storage!.from('admin-private').upload(
        safe,
        buffer,
        { contentType: options.contentType || 'application/octet-stream', upsert: Boolean(options.upsert) },
      )
      if (error) return { ok: false, path: safe, error: 'The file could not be stored.' }
      return { ok: true, path: safe }
    }

    const full = resolvePrivatePath(safe)
    if (!full) return { ok: false, path: safe, error: 'Invalid storage path.' }

    if (!options.upsert && fs.existsSync(full)) {
      return { ok: false, path: safe, error: 'File already exists and overwrite is disabled.' }
    }

    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, buffer)

    return { ok: true, path: safe, error: undefined }
  } catch (err) {
    console.error('[storage] Private object upload failed:', err)
    return { ok: false, path: options.path, error: 'The file could not be stored.' }
  }
}

export async function readPrivateText(relativePath: string): Promise<string | null> {
  try {
    const safe = sanitizeRelativePath(relativePath)
    if (!safe) return null

    if (isSupabaseRuntimeConfigured()) {
      const body = await readPrivateObject(safe)
      return body ? Buffer.from(body).toString('utf-8') : null
    }
    const full = resolvePrivatePath(safe)
    if (!full || !fs.existsSync(full)) return null
    return fs.readFileSync(full, 'utf-8')
  } catch (err) {
    console.error('[storage] Private text read failed:', err)
    return null
  }
}

export async function readPrivateObject(relativePath: string): Promise<Uint8Array | null> {
  try {
    const safe = sanitizeRelativePath(relativePath)
    if (!safe) return null

    if (isSupabaseRuntimeConfigured()) {
      const { data, error } = await createSupabaseServiceClient().storage!.from('admin-private').download(safe)
      return error || !data ? null : new Uint8Array(await data.arrayBuffer())
    }
    const full = resolvePrivatePath(safe)
    return full && fs.existsSync(full) ? new Uint8Array(fs.readFileSync(full)) : null
  } catch (err) {
    console.error('[storage] Private object read failed:', err)
    return null
  }
}

export async function deletePrivateObject(relativePath: string): Promise<boolean> {
  try {
    const safe = sanitizeRelativePath(relativePath)
    if (!safe) return false

    if (isSupabaseRuntimeConfigured()) {
      const { error } = await createSupabaseServiceClient().storage!.from('admin-private').remove([safe])
      return !error
    }
    const full = resolvePrivatePath(safe)
    if (!full || !fs.existsSync(full)) return true
    fs.unlinkSync(full)
    return true
  } catch (err) {
    console.error('[storage] Private object delete failed:', err)
    return false
  }
}

export async function deletePrivateApplication(directory: string): Promise<boolean> {
  try {
    const safe = sanitizeRelativePath(directory)
    if (!safe || !safe.startsWith('applications/')) return false
    if (isSupabaseRuntimeConfigured()) {
      const storage = createSupabaseServiceClient().storage!.from('admin-private')
      while (true) {
        const objects = await listPrivateObjects(safe, 1000)
        if (!objects) return false
        if (!objects.length) return true
        const { error } = await storage.remove(objects.map((object) => `${safe}/${object.name}`))
        if (error) return false
        if (objects.length < 1000) return true
      }
    }
    const full = path.resolve(PRIVATE_ROOT, safe)
    if (!full.startsWith(PRIVATE_ROOT + path.sep)) return false
    fs.rmSync(full, { recursive: true, force: true })
    return true
  } catch (err) {
    console.error('[storage] Private application delete failed:', err)
    return false
  }
}

export type PrivateObjectEntry = { id: string | null; name: string }

export async function listPrivateObjects(
  prefix: string,
  limit = 100,
): Promise<PrivateObjectEntry[] | null> {
  try {
    const safe = sanitizeRelativePath(prefix)
    if (!safe) return null
    if (isSupabaseRuntimeConfigured()) {
      const storage = createSupabaseServiceClient().storage!.from('admin-private')
      const result: PrivateObjectEntry[] = []
      const visit = async (folder: string): Promise<boolean> => {
        const { data, error } = await storage.list(folder, { limit: Math.max(1, Math.min(limit, 1000)) })
        if (error || !Array.isArray(data)) return false
        for (const entry of data as Array<{ id?: string | null; name?: string }>) {
          if (typeof entry.name !== 'string' || !entry.name || entry.name.includes('/')) continue
          const objectPath = folder ? `${folder}/${entry.name}` : entry.name
          if (entry.id === null) {
            if (!await visit(objectPath)) return false
          } else {
            result.push({ id: entry.id ?? null, name: objectPath.slice(safe.length + 1) })
            if (result.length >= limit) return true
          }
        }
        return true
      }
      return await visit(safe) ? result.slice(0, limit) : null
    }
    const full = path.resolve(PRIVATE_ROOT, safe)
    if (!full.startsWith(PRIVATE_ROOT + path.sep)) return null
    if (!fs.existsSync(full)) return []

    const entries = fs
      .readdirSync(full, { withFileTypes: true })
      .map((entry) => {
        const entryPath = path.join(full, entry.name)
        const stat = fs.statSync(entryPath)
        return {
          id: entry.isDirectory() ? null : randomUUID(),
          name: entry.name,
          mtime: stat.mtimeMs,
        }
      })
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, limit)
      .map(({ id, name }) => ({ id, name }))

    return entries
  } catch (err) {
    console.error('[storage] Private object listing failed:', err)
    return null
  }
}

// ────────────────────────── Signed private URLs ──────────────────────────

export function createPrivateSignedUrl(relativePath: string, ttlSeconds = 300): string {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds
  const signature = createHmac('sha256', getDerivedFileSigningSecret())
    .update(`${relativePath}|${expires}`)
    .digest('hex')
  const query = new URLSearchParams({
    path: relativePath,
    expires: String(expires),
    sig: signature,
  })
  return `/api/admin/private-file?${query.toString()}`
}
