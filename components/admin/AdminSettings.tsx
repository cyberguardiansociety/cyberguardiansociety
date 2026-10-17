import Link from 'next/link'
import { AlertTriangle, BookOpen, ClipboardList, LockKeyhole, Settings2, ShieldCheck, Wrench } from 'lucide-react'
import { getMaintenanceSettings, getPortalSettings, type PortalSettings } from '@/lib/portal-settings'
import { changePortalSetting, saveMaintenanceMessage } from '@/app/admin/settings-actions'
import TypedDangerAction from '@/components/admin/TypedDangerAction'
import TrafficMonitor from '@/components/admin/TrafficMonitor'

const tabs = [
  { id: 'general', label: 'General', icon: Settings2 },
  { id: 'forms', label: 'Applications & Pages', icon: ClipboardList },
  { id: 'maintenance', label: 'Maintenance mode', icon: Wrench },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'danger-zone', label: 'Danger Zone', icon: AlertTriangle },
] as const

type TabId = (typeof tabs)[number]['id']

function SettingSwitch({
  title,
  description,
  settingKey,
  enabled,
}: {
  title: string
  description: string
  settingKey: keyof PortalSettings
  enabled: boolean
}) {
  return (
    <article className="settings-control">
      <div className="settings-control__copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="settings-control__action">
        <span className={`settings-state${enabled ? ' is-on' : ''}`}>
          {enabled ? 'On' : 'Off'}
        </span>
        <form action={changePortalSetting}>
          <input type="hidden" name="key" value={settingKey} />
          <input type="hidden" name="value" value={String(!enabled)} />
          <button className={enabled ? 'admin-secondary-button' : 'admin-primary-button'} type="submit">
            Turn {enabled ? 'off' : 'on'}
          </button>
        </form>
      </div>
    </article>
  )
}

export default async function AdminSettings({
  tab = 'general',
}: {
  tab?: string
}) {
  const activeTab: TabId = tabs.some((item) => item.id === tab) ? (tab as TabId) : 'general'
  let settings: PortalSettings
  let maintenanceMessage: string
  try {
    const [portalSettings, maintenanceSettings] = await Promise.all([
      getPortalSettings(),
      getMaintenanceSettings(),
    ])
    settings = portalSettings
    maintenanceMessage = maintenanceSettings.message
  } catch {
    return <p role="alert" className="admin-alert admin-alert--error">Settings could not be loaded. Check the database connection and reload this page.</p>
  }

  return (
    <section className="admin-section admin-section--flush admin-settings">
      <nav className="cms-category-tabs settings-tabs" aria-label="Settings sections">
        {tabs.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            href={`?view=settings&tab=${id}`}
            className={`cms-tab-btn${activeTab === id ? ' active' : ''}`}
            aria-current={activeTab === id ? 'page' : undefined}
          >
            <Icon size={14} /> {label}
          </Link>
        ))}
      </nav>

      {activeTab === 'general' ? (
        <div className="settings-panel">
          <div className="settings-panel__heading">
            <h2>Site operations</h2>
            <p>Control the public portal and the site-wide attendance check-in gate.</p>
          </div>
          <SettingSwitch title="Public portal" description="Allow the site's portal and attendance features to operate." settingKey="portal_open" enabled={settings.portal_open} />
          <SettingSwitch title="Attendance check-in" description="Allow check-ins when the selected session's attendance window is open." settingKey="attendance_open" enabled={settings.attendance_open} />
        </div>
      ) : null}

      {activeTab === 'forms' ? (
        <div className="settings-panel">
          <div className="settings-panel__heading">
            <h2>Applications &amp; Pages availability</h2>
            <p>Control Coming Soon status for public application forms, products, and resource pages. Closed forms also reject direct API submissions.</p>
          </div>
          <SettingSwitch title="Join CGS application" description="Controls the application form at /join-cgs." settingKey="join_cgs_coming_soon" enabled={settings.join_cgs_coming_soon} />
          <SettingSwitch title="Speaker application" description="Controls the speaker proposal form at /join-as-speaker." settingKey="speaker_coming_soon" enabled={settings.speaker_coming_soon} />
          <SettingSwitch title="Products page" description="Controls the products page at /products with a Coming Soon notice when enabled." settingKey="products_coming_soon" enabled={settings.products_coming_soon} />
          <SettingSwitch title="Free resources page" description="Controls the Free Resources library at /products#resources with a Coming Soon notice when enabled." settingKey="resources_coming_soon" enabled={settings.resources_coming_soon} />
        </div>
      ) : null}

      {activeTab === 'maintenance' ? (
        <div className="settings-panel settings-panel--maintenance">
          <div className="settings-panel__heading">
            <h2><Wrench size={19} /> Website maintenance</h2>
            <p>When enabled, public pages and public APIs show the notice below. The admin panel and login remain available so you can turn maintenance mode off.</p>
          </div>
          <SettingSwitch
            title="Maintenance mode"
            description="Immediately take public pages and submissions offline until you switch this back off."
            settingKey="maintenance_mode"
            enabled={settings.maintenance_mode}
          />
          {settings.maintenance_mode ? (
            <p className="maintenance-active-note" role="status">Maintenance mode is active. Visitors are currently seeing your notice.</p>
          ) : null}
          <form action={saveMaintenanceMessage} className="maintenance-message-form">
            <label htmlFor="maintenance-message">Message shown to visitors</label>
            <textarea
              id="maintenance-message"
              name="message"
              defaultValue={maintenanceMessage}
              minLength={10}
              maxLength={500}
              rows={5}
              required
            />
            <div className="maintenance-message-form__footer">
              <small>10–500 characters. This message appears while maintenance mode is on.</small>
              <button className="admin-primary-button" type="submit">Save message</button>
            </div>
          </form>
        </div>
      ) : null}

      {activeTab === 'security' ? (
        <div className="settings-panel">
          <div className="settings-panel__heading">
            <h2>Security management</h2>
            <p>Manage administrator access, review recorded changes, and monitor platform traffic for threats.</p>
          </div>
          <div className="settings-link-grid">
            <Link href="?view=administrators" className="settings-link-card"><LockKeyhole size={18} /><span><strong>Administrator access</strong><small>Manage limited administrator accounts and permissions.</small></span></Link>
            <Link href="?view=activity" className="settings-link-card"><BookOpen size={18} /><span><strong>Audit log</strong><small>Review changes made in the administration panel.</small></span></Link>
          </div>
          <p className="admin-form-note">The protected Master administrator account cannot be edited or deleted from the administrator manager.</p>

          {/* Traffic Monitoring & Attack Identifier */}
          <div style={{ marginTop: '24px' }}>
            <TrafficMonitor />
          </div>
        </div>
      ) : null}

      {activeTab === 'danger-zone' ? (
        <div className="settings-panel settings-panel--danger">
          <div className="settings-panel__heading">
            <h2><AlertTriangle size={19} /> Danger Zone</h2>
            <p>These actions can remove records or change security state. Each action requires its own exact phrase, checked again by the server.</p>
          </div>
          <TypedDangerAction title="Reset site settings" description="Restore default portal and attendance gates, reopen both application forms, and switch maintenance mode off." action="reset-settings" phrase="RESET CGS SETTINGS" button="Reset settings" />
          <TypedDangerAction title="Clear administrator login lockouts" description="Remove failed-attempt and lockout history for every administrator. This does not change account credentials." action="clear-lockouts" phrase="CLEAR ALL LOGIN LOCKOUTS" button="Clear lockouts" />
          <TypedDangerAction title="Delete all draft content" description="Permanently delete draft announcements, products, merchandise, and resources. Published and archived content is kept." action="delete-drafts" phrase="DELETE ALL DRAFT CONTENT" button="Delete drafts" />
        </div>
      ) : null}
    </section>
  )
}
