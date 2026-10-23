import { useState } from 'react'
import { useLanguage } from '../i18n/index.jsx'

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी' },
  { value: 'mr', label: 'मराठी' },
]

export default function AdminSettings({ user, token }) {
  const { language, setLanguage: changeLanguage, t } = useLanguage()
  const [theme, setTheme] = useState('light')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')


  async function handleLanguageChange(event) {
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const nextLanguage = event.target.value
      await changeLanguage(nextLanguage)
      setMessage(nextLanguage === 'mr' ? 'भाषेची निवड जतन केली.' : nextLanguage === 'hi' ? 'भाषा की पसंद सहेजी गई।' : 'Language preference saved.')
    } catch (err) {
      setError(err.message || t('languageSaveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`admin-settings-page ${theme === 'dark' ? 'admin-settings-dark' : ''}`}>
      <header className="admin-settings-heading">
        <div>
          <span className="admin-settings-eyebrow">GRAMSEVA / SETTINGS</span>
          <h1>Profile &amp; Settings</h1>
          <p>Manage your account and preferences.</p>
        </div>
      </header>

      <section className="admin-settings-profile">
        <div className="admin-settings-avatar">
          {(user?.full_name || 'A').trim().charAt(0).toUpperCase()}
        </div>
        <div className="admin-settings-profile-info">
          <h2>{user?.full_name || 'Administrator'}</h2>
          <p>{user?.email || 'Email not available'}</p>
          <span>{user?.role || 'Administrator'}</span>
        </div>
        <div className="admin-settings-profile-note">Administrator account</div>
      </section>

      <div className="admin-settings-grid">
        <section className="admin-settings-card">
          <h2>Account Settings</h2>

          <div className="admin-settings-row">
            <div><strong>Change Password</strong><p>Password management</p></div>
            <span className="admin-settings-coming">Not available yet</span>
          </div>

          <div className="admin-settings-row">
            <div><strong>Notification Preferences</strong><p>Manage account notifications</p></div>
            <span className="admin-settings-coming">Not available yet</span>
          </div>

          <label className="admin-settings-row">
            <div><strong>Language</strong><p>Choose your preferred language</p></div>
            <select value={language} onChange={handleLanguageChange} disabled={saving}>
              {LANGUAGES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>

          <label className="admin-settings-row">
            <div><strong>Theme</strong><p>Preview this settings panel</p></div>
            <select value={theme} onChange={event => setTheme(event.target.value)}>
              <option value="light">Light</option>
              <option value="dark">Dark preview</option>
            </select>
          </label>

          {saving && <p className="admin-settings-feedback">Saving language…</p>}
          {message && <p className="admin-settings-feedback" role="status">{message}</p>}
          {error && <p className="admin-settings-error" role="alert">{error}</p>}
        </section>

        <section className="admin-settings-card">
          <h2>System Settings</h2>
          <div className="admin-settings-static-field">
            <span>Organisation Name</span><strong>GramSeva</strong>
          </div>
          <div className="admin-settings-static-field">
            <span>Location</span><strong>Maharashtra, India</strong>
          </div>
          <div className="admin-settings-about">
            <span>About</span>
            <p>A platform for better villages and stronger communities.</p>
          </div>
          <p className="admin-settings-note">Organisation details are currently read-only.</p>
        </section>
      </div>
    </div>
  )
}
