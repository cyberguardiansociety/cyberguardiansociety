'server-only'

type BodyError = { ok: false; status: number; error: string }
type BodySuccess = { ok: true; bytes: ArrayBuffer }
type BodyReadResult = BodyError | BodySuccess

export type ParsedBody<T> = { ok: true; data: T } | BodyError

export function hasSameOrigin(request: Request) {
  const originHeader = request.headers.get('origin')
  if (!originHeader) return false

  try {
    const configuredOrigin = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL
    if (process.env.NODE_ENV === 'production' && !configuredOrigin) return false
    const expectedOrigin = configuredOrigin ? new URL(configuredOrigin).origin : new URL(request.url).origin
    return new URL(originHeader).origin === expectedOrigin
  } catch {
    return false
  }
}

async function readBoundedBody(request: Request, maxBytes: number): Promise<BodyReadResult> {
  const contentLength = request.headers.get('content-length')
  if (contentLength) {
    if (!/^\d+$/.test(contentLength)) {
      return { ok: false, status: 400, error: 'Invalid content length.' }
    }
    if (Number(contentLength) > maxBytes) {
      return { ok: false, status: 413, error: 'Request body is too large.' }
    }
  }

  const reader = request.body?.getReader()
  if (!reader) return { ok: true, bytes: new ArrayBuffer(0) }

  const chunks: Uint8Array[] = []
  let totalBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > maxBytes) {
        await reader.cancel()
        return { ok: false, status: 413, error: 'Request body is too large.' }
      }
      chunks.push(value)
    }
  } catch {
    return { ok: false, status: 400, error: 'Could not read request body.' }
  } finally {
    reader.releaseLock()
  }

  const bytes = new ArrayBuffer(totalBytes)
  const byteView = new Uint8Array(bytes)
  let offset = 0
  for (const chunk of chunks) {
    byteView.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { ok: true, bytes }
}

export async function readJsonBody(
  request: Request,
  maxBytes: number,
): Promise<ParsedBody<unknown>> {
  if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return { ok: false, status: 415, error: 'Content-Type must be application/json.' }
  }

  const result = await readBoundedBody(request, maxBytes)
  if (!result.ok) return result

  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(result.bytes)
    return { ok: true, data: JSON.parse(text) as unknown }
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON request body.' }
  }
}

export async function readMultipartBody(
  request: Request,
  maxBytes: number,
): Promise<ParsedBody<FormData>> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('multipart/form-data;')) {
    return { ok: false, status: 415, error: 'Content-Type must be multipart/form-data.' }
  }

  const result = await readBoundedBody(request, maxBytes)
  if (!result.ok) return result

  try {
    const response = new Response(result.bytes, { headers: { 'content-type': contentType } })
    return { ok: true, data: await response.formData() }
  } catch {
    return { ok: false, status: 400, error: 'Invalid multipart request body.' }
  }
}
