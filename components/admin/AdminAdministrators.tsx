import { redirect } from 'next/navigation'
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Crown,
  Lock,
  KeyRound,
  Fingerprint,
  Zap,
  Users,
} from 'lucide-react'
import { requirePermission } from '@/lib/admin-auth'
import { adminUrl } from '@/lib/admin-config'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { createDelegatedAdmin, setDelegatedAdminActive, deleteDelegatedAdmin } from '@/app/admin/management-actions'
import AdminPermissionGrid from './AdminPermissionGrid'
import AdminFormSubmitButton from './AdminFormSubmitButton'
import AdminDeleteAccountButton from './AdminDeleteAccountButton'

const permissionGroups = [
  { label: 'Sessions and attendees', items: [['sessions', 'Sessions and timing'], ['speakers', 'Speaker profiles'], ['speaker_applications', 'Speaker applications']] },
  { label: 'Public submissions', items: [['applications', 'CGS Team applications'], ['inbox', 'Contact inbox']] },
  { label: 'Website content', items: [['content_announcement', 'Announcements'], ['content_product', 'Products'], ['content_resource', 'Free resources']] },
  { label: 'Operations', items: [['audit', 'Audit log'], ['google_sync', 'Google Sheets sync']] },
] as const

const PERMISSION_LABELS: Record<string, { label: string; icon: string }> = {
  sessions: { label: 'Sessions & Timing', icon: '📅' },
  speakers: { label: 'Speaker Profiles', icon: '🎙️' },
  speaker_applications: { label: 'Speaker Applications', icon: '📋' },
  applications: { label: 'Team Applications', icon: '📝' },
  inbox: { label: 'Inquiries Inbox', icon: '📨' },
  content_announcement: { label: 'Announcements CMS', icon: '📢' },
  content_product: { label: 'Products CMS', icon: '🛡️' },
  content_resource: { label: 'Free Resources CMS', icon: '📚' },
  audit: { label: 'Audit Trail', icon: '🔍' },
  google_sync: { label: 'Google Sheets Sync', icon: '🔄' },
}

type AdminUser = {
  user_id: string
  username: string | null
  role: string
  active: boolean
  is_protected: boolean
  permission_keys: string[]
}

export default async function AdminAdministrators() {
  const context = await requirePermission('admins')
  if (context.admin.role !== 'super_admin') redirect(adminUrl('', { error: 'forbidden' }))
  const service = createSupabaseServiceClient()
  const [{ data: profileRows, error }, { data: authUsers }] = await Promise.all([
    service.from('admin_users').select('user_id, username, role, active, is_protected, permission_keys').order('created_at', { ascending: true }),
    service.auth.admin.listUsers({ page: 1, perPage: 100 }),
  ])
  const profiles = (profileRows ?? []) as AdminUser[]
  const emails = new Map((authUsers?.users ?? []).map((user) => [user.id, user.email ?? 'Email unavailable']))

  const superAdminCount = profiles.filter((p) => p.role === 'super_admin').length
  const delegatedCount = profiles.filter((p) => p.role !== 'super_admin').length
  const activeCount = profiles.filter((p) => p.active).length

  return (
    <div className="admin-management-layout admin-modern-layout">
      <section className="admin-section admin-management-create admin-modern-create">
        <div className="admin-section__head">
          <div className="admin-section__head-icon">
            <Shield size={20} />
          </div>
          <div>
            <p className="admin-kicker">Restricted control</p>
            <h2>Create a limited admin</h2>
          </div>
        </div>
        <p className="admin-form-note">The password is sent directly to Supabase Auth and is never stored in the CGS database. Require a unique, temporary password and have the administrator change it after first sign-in.</p>
        <form action={createDelegatedAdmin} className="admin-management-form admin-modern-form">
          <div className="admin-form-grid">
            <label className="admin-label">
              <span>Email address</span>
              <input name="email" type="email" autoComplete="off" maxLength={254} placeholder="admin@example.com" required />
            </label>
            <label className="admin-label">
              <span>Temporary password (12+ characters)</span>
              <input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} placeholder="••••••••••••" required />
            </label>
          </div>

          {/* Smooth animated Cyber Permission Checkbox Grid */}
          <AdminPermissionGrid groups={permissionGroups} />

          <AdminFormSubmitButton
            pendingLabel="Provisioning administrator…"
            icon={<Shield size={16} />}
            style={{ marginTop: '16px' }}
          >
            Create admin account
          </AdminFormSubmitButton>
        </form>
      </section>

      {/* Redesigned Right Column: Access Control & Security Personnel Ledger */}
      <section className="admin-ops-directory" aria-label="Administrator directory">
        <div className="admin-ops-header-card">
          <div className="admin-ops-header-top">
            <div className="admin-ops-header-title-wrap">
              <div className="admin-ops-header-icon">
                <ShieldCheck size={22} />
              </div>
              <div>
                <p className="admin-ops-header-kicker">Role-Based Access Control (RBAC)</p>
                <h2 className="admin-ops-header-title">
                  Security Personnel &amp; Operators
                  <span className="admin-ops-header-badge">{profiles.length} Active</span>
                </h2>
              </div>
            </div>
          </div>
          <p className="admin-ops-header-desc">
            Cryptographically verified operators authorized for governance, operations, and platform management.
          </p>

          <div className="admin-ops-stat-ribbon">
            <div className="admin-ops-stat-item">
              <span className="admin-ops-stat-label">Total Operators</span>
              <span className="admin-ops-stat-value">
                <Users size={14} style={{ color: '#60a5fa' }} />
                {profiles.length}
              </span>
            </div>
            <div className="admin-ops-stat-item">
              <span className="admin-ops-stat-label">Super Admins</span>
              <span className="admin-ops-stat-value">
                <Crown size={14} style={{ color: '#fbbf24' }} />
                {superAdminCount}
              </span>
            </div>
            <div className="admin-ops-stat-item">
              <span className="admin-ops-stat-label">Delegated Operators</span>
              <span className="admin-ops-stat-value">
                <Shield size={14} style={{ color: '#38bdf8' }} />
                {delegatedCount}
              </span>
            </div>
            <div className="admin-ops-stat-item">
              <span className="admin-ops-stat-label">Security Policy</span>
              <span className="admin-ops-stat-value" style={{ color: '#34d399', fontSize: '13px' }}>
                <span className="admin-op-pulse-dot" />
                {activeCount} Active / Zero-Trust
              </span>
            </div>
          </div>
        </div>

        {error ? (
          <p role="alert" className="admin-alert admin-alert--error">
            Administrator accounts are currently unavailable. Verify Supabase connection.
          </p>
        ) : null}

        <div className="admin-management-list">
          {profiles.map((profile) => {
            const email = emails.get(profile.user_id) ?? 'Email unavailable'
            const isSuper = profile.role === 'super_admin'
            const isCurrentUser = profile.user_id === context.user.id
            const avatarInitials = (profile.username || email.split('@')[0] || 'AD')
              .slice(0, 2)
              .toUpperCase()

            return (
              <article
                className={`admin-op-card ${isSuper ? 'admin-op-card--super' : ''} ${!profile.active ? 'admin-op-card--inactive' : ''}`}
                key={profile.user_id}
                data-active={profile.active}
              >
                <div className="admin-op-card-top">
                  <span className={`admin-op-role-pill ${isSuper ? 'admin-op-role-pill--super' : 'admin-op-role-pill--delegated'}`}>
                    {isSuper ? <Crown size={13} /> : <ShieldCheck size={13} />}
                    {isSuper ? 'Root · Super Admin' : 'Delegated Operator'}
                  </span>

                  <span className={`admin-op-status-pill ${profile.active ? 'admin-op-status-pill--active' : 'admin-op-status-pill--suspended'}`}>
                    <span className="admin-op-status-dot" />
                    {profile.active ? 'Active Operator' : 'Access Suspended'}
                  </span>
                </div>

                <div className="admin-op-identity">
                  <div className={`admin-op-avatar ${isSuper ? 'admin-op-avatar--super' : ''}`}>
                    {isSuper ? <Crown size={22} /> : avatarInitials}
                  </div>

                  <div className="admin-op-details">
                    <div className="admin-op-email" title={email}>
                      {email}
                    </div>
                    <div className="admin-op-meta-row">
                      {profile.username && (
                        <span className="admin-op-username">@{profile.username}</span>
                      )}
                      <span className="admin-op-uid" title={`System UID: ${profile.user_id}`}>
                        UID: {profile.user_id.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                </div>

                <div className="admin-op-policy-block">
                  <div className="admin-op-policy-title">
                    <KeyRound size={12} />
                    {isSuper ? 'System Privilege Scope' : `Delegated Capabilities (${profile.permission_keys?.length || 0})`}
                  </div>

                  {isSuper ? (
                    <div className="admin-op-root-banner">
                      <Zap size={16} />
                      <div>
                        <strong>Complete Root Authority</strong>
                        <p style={{ margin: '2px 0 0', color: '#cbd5e1' }}>
                          Unrestricted governance across attendance, session timing, speaker profiles, CMS content, sheets sync, and access control.
                        </p>
                      </div>
                    </div>
                  ) : profile.permission_keys && profile.permission_keys.length > 0 ? (
                    <div className="admin-op-chips-grid">
                      {profile.permission_keys.map((permKey) => {
                        const meta = PERMISSION_LABELS[permKey] || {
                          label: permKey.replaceAll('_', ' '),
                          icon: '⚡',
                        }
                        return (
                          <span className="admin-op-chip" key={permKey}>
                            <span className="admin-op-chip-icon">{meta.icon}</span>
                            <span>{meta.label}</span>
                          </span>
                        )
                      })}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                      No specific permission flags granted. Operator cannot access protected workspaces.
                    </p>
                  )}
                </div>

                <div className="admin-op-actions-dock">
                  {profile.is_protected ? (
                    <span className="admin-op-protected-tag">
                      <Lock size={12} /> Protected Master Owner · Deletion Prohibited
                    </span>
                  ) : isCurrentUser ? (
                    <span
                      className="admin-op-protected-tag"
                      style={{
                        background: 'rgba(59, 130, 246, 0.12)',
                        borderColor: 'rgba(59, 130, 246, 0.3)',
                        color: '#93c5fd',
                      }}
                    >
                      <Fingerprint size={12} /> Current Active Session
                    </span>
                  ) : (
                    <>
                      <form action={setDelegatedAdminActive}>
                        <input type="hidden" name="userId" value={profile.user_id} />
                        <input type="hidden" name="active" value={profile.active ? 'false' : 'true'} />
                        <button
                          type="submit"
                          className={`admin-op-btn-toggle ${profile.active ? 'admin-op-btn-toggle--suspend' : 'admin-op-btn-toggle--restore'}`}
                          title={profile.active ? 'Temporarily suspend operator access' : 'Restore operator access'}
                        >
                          {profile.active ? <ShieldAlert size={13} /> : <ShieldCheck size={13} />}
                          <span>{profile.active ? 'Suspend Access' : 'Restore Access'}</span>
                        </button>
                      </form>

                      <AdminDeleteAccountButton
                        userId={profile.user_id}
                        adminEmail={email}
                        action={deleteDelegatedAdmin}
                      />
                    </>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

