import { redirect } from 'next/navigation'
import { Shield, User, ShieldCheck, ShieldAlert, Crown } from 'lucide-react'
import { requirePermission } from '@/lib/admin-auth'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { createDelegatedAdmin, setDelegatedAdminActive } from '@/app/admin/management-actions'
import AdminPermissionGrid from './AdminPermissionGrid'

const permissionGroups = [
  { label: 'Sessions and attendees', items: [['sessions', 'Sessions and timing'], ['speakers', 'Speaker profiles'], ['speaker_applications', 'Speaker applications']] },
  { label: 'Public submissions', items: [['applications', 'Membership applications'], ['inbox', 'Contact inbox']] },
  { label: 'Website content', items: [['content_announcement', 'Announcements'], ['content_product', 'Products'], ['content_resource', 'Free resources']] },
  { label: 'Operations', items: [['audit', 'Audit log'], ['google_sync', 'Google Sheets sync']] },
] as const

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
  if (context.admin.role !== 'super_admin') redirect('/admin?error=forbidden')
  const service = createSupabaseServiceClient()
  const [{ data: profileRows, error }, { data: authUsers }] = await Promise.all([
    service.from('admin_users').select('user_id, username, role, active, is_protected, permission_keys').order('created_at', { ascending: true }),
    service.auth.admin.listUsers({ page: 1, perPage: 100 }),
  ])
  const profiles = (profileRows ?? []) as AdminUser[]
  const emails = new Map((authUsers?.users ?? []).map((user) => [user.id, user.email ?? 'Email unavailable']))

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

          <button type="submit" className="admin-primary-button admin-modern-button" style={{ marginTop: '16px' }}>
            <Shield size={16} />
            Create admin account
          </button>
        </form>
      </section>

      <section className="admin-section admin-section--flush admin-modern-list">
        <div className="admin-section__head">
          <div className="admin-section__head-icon">
            <User size={20} />
          </div>
          <div>
            <p className="admin-kicker">Provisioned access</p>
            <h2>Administrators <span>{profiles.length}</span></h2>
          </div>
        </div>
        {error ? <p role="alert" className="admin-alert admin-alert--error">Administrator accounts are unavailable.</p> : null}
        <div className="admin-management-list admin-modern-cards">
          {profiles.map((profile) => (
            <article className="admin-managed-admin admin-modern-card" key={profile.user_id} data-active={profile.active}>
              <div className="admin-card-header">
                <div className="admin-card-avatar">
                  {profile.role === 'super_admin' ? <Crown size={18} /> : <ShieldCheck size={18} />}
                </div>
                <div className="admin-card-info">
                  <strong>
                    {profile.username ? `${profile.username} · ` : ''}
                    {emails.get(profile.user_id) ?? 'Email unavailable'}
                  </strong>
                  <div className="admin-card-meta">
                    <span className="admin-card-role">{profile.role.replaceAll('_', ' ')}</span>
                    <span className={`admin-card-status ${profile.active ? 'status-active' : 'status-inactive'}`}>
                      {profile.active ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="admin-card-body">
                <p className="admin-card-permissions">
                  {profile.is_protected
                    ? 'Protected owner account · credentials cannot be changed or deleted'
                    : profile.role === 'limited_admin'
                      ? profile.permission_keys.join(' · ')
                      : 'Full administrator access'}
                </p>
              </div>
              {profile.role === 'limited_admin' && profile.user_id !== context.user.id ? (
                <div className="admin-card-actions">
                  <form action={setDelegatedAdminActive}>
                    <input type="hidden" name="userId" value={profile.user_id} />
                    <input type="hidden" name="active" value={profile.active ? 'false' : 'true'} />
                    <button type="submit" className={profile.active ? 'admin-danger-button admin-modern-button-small' : 'admin-secondary-button admin-modern-button-small'}>
                      {profile.active ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                      {profile.active ? 'Disable access' : 'Restore access'}
                    </button>
                  </form>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
