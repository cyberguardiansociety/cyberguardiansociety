import { redirect } from 'next/navigation'
import { getAdminContext } from '@/lib/admin-auth'
import { signIn } from '@/app/admin/login/actions'
import { adminUrl } from '@/lib/admin-config'
import ClayButton from '@/components/ui/ClayButton'
import Container from '@/components/ui/Container'

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>
}) {
  // If already authenticated, redirect to the admin console.
  const adminContext = await getAdminContext()
  if (adminContext) {
    redirect(adminUrl())
  }

  const params = await searchParams
  const error = typeof params?.error === 'string' ? params.error : undefined

  return (
    <main id="main" className="admin-login-page section--tight min-h-[70vh]">
      <Container>
        <div className="admin-login-card mx-auto max-w-md">
          <p className="eyebrow">Restricted Management Area</p>
          <h1 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            Administrator sign in
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            Sign in with provisioned credentials to access administrative systems.
          </p>

          {error ? (
            <div role="alert" className="mt-5 rounded-lg border border-error bg-bg px-4 py-3 text-sm text-error">
              {error === 'unauthorized'
                ? 'This area is restricted to provisioned administrator accounts.'
                : error === 'setup'
                  ? 'Admin access is not configured. Run the seed script to create an admin account.'
                  : error === 'credentials'
                    ? 'Invalid credentials.'
                    : error === 'locked'
                      ? 'Account temporarily locked due to consecutive failed attempts. Please retry later.'
                      : error === 'rate-limit'
                        ? 'Too many authentication attempts from this network. Please wait before retrying.'
                        : 'Authentication failed. Please verify your credentials and try again.'}
            </div>
          ) : null}

          <form action={signIn} className="mt-8 space-y-5">
              <label className="block text-sm font-medium">
                <span className="mb-1.5 block text-ink-muted">Email address or username</span>
                <input
                  className="field"
                  autoComplete="username"
                  name="email"
                  type="text"
                  required
                  maxLength={320}
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </label>
              <label className="block text-sm font-medium">
                <span className="mb-1.5 block text-ink-muted">Password</span>
                <input
                  className="field"
                  autoComplete="current-password"
                  name="password"
                  type="password"
                  required
                  maxLength={1024}
                />
              </label>
              <ClayButton type="submit" className="w-full">
                Sign in
              </ClayButton>
          </form>
        </div>
      </Container>
    </main>
  )
}
