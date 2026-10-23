import { useState } from 'react'
import LanguageSelector from '../components/LanguageSelector.jsx'
import { useLanguage } from '../i18n/index.jsx'
import { loginUser, registerCitizen } from '../services/api.js'

const copy = {
  en: {
    back: '← Back',
    tagline: 'Your Voice. Our Priority.',
    headline: <>Together for a<br />Better Tomorrow</>,
    description: <>Report issues. Track progress.<br />Build a stronger community.</>,
    features: ['Easy complaint reporting', 'Track every update', 'Build a stronger community'],
    citizen: "I'm a Citizen",
    worker: 'Field Worker',
    admin: 'Administrator',
    citizenDescription: 'Log in to raise complaints, track status and access public services.',
    login: 'Login',
    google: 'Continue with Google',
    or: 'or',
    nameOrEmail: 'Full Name / Registered Email',
    email: 'Email Address',
    emailPlaceholder: 'Enter your email',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    showPassword: 'Show password',
    forgot: 'Forgot your password?',
    newHere: 'New here?',
    createAccount: 'Create an Account',
    already: 'Already registered?',
    confirmPassword: 'Confirm password',
    phone: 'Mobile number',
    fullName: 'Full name',
    loginId: 'Login ID',
    support: 'Contact support',
    mismatch: 'Passwords do not match.',
    signupNotice: 'Registration needs to be connected to the backend.',
    loginNotice: 'Login needs to be connected to the backend.',
    googleNotice: 'Google sign-in needs OAuth configuration.',
    forgotNotice: 'Password recovery needs to be connected to the backend.',
  },
  hi: {
    back: '← वापस',
    tagline: 'आपकी आवाज़। हमारी प्राथमिकता।',
    headline: <>बेहतर कल के लिए<br />साथ मिलकर</>,
    description: <>समस्याएँ बताएँ। प्रगति देखें।<br />समुदाय को मजबूत बनाएँ।</>,
    features: ['आसानी से शिकायत दर्ज करें', 'हर अपडेट देखें', 'समुदाय को मजबूत बनाएँ'],
    citizen: 'मैं नागरिक हूँ',
    worker: 'फील्ड वर्कर',
    admin: 'प्रशासक',
    citizenDescription: 'शिकायत दर्ज करें, स्थिति देखें और सार्वजनिक सेवाओं तक पहुँचें।',
    login: 'लॉग इन',
    google: 'Google से जारी रखें',
    or: 'या',
    nameOrEmail: 'पूरा नाम / पंजीकृत ईमेल',
    email: 'ईमेल पता',
    emailPlaceholder: 'अपना ईमेल दर्ज करें',
    password: 'पासवर्ड',
    passwordPlaceholder: 'अपना पासवर्ड दर्ज करें',
    showPassword: 'पासवर्ड दिखाएँ',
    forgot: 'पासवर्ड भूल गए?',
    newHere: 'नए हैं?',
    createAccount: 'खाता बनाएँ',
    already: 'पहले से पंजीकृत हैं?',
    confirmPassword: 'पासवर्ड की पुष्टि करें',
    phone: 'मोबाइल नंबर',
    fullName: 'पूरा नाम',
    loginId: 'लॉगिन आईडी',
    support: 'सहायता से संपर्क करें',
    mismatch: 'पासवर्ड मेल नहीं खाते।',
    signupNotice: 'पंजीकरण को बैकएंड से जोड़ना बाकी है।',
    loginNotice: 'लॉगिन को बैकएंड से जोड़ना बाकी है।',
    googleNotice: 'Google लॉगिन के लिए OAuth सेटअप आवश्यक है।',
    forgotNotice: 'पासवर्ड रिकवरी को बैकएंड से जोड़ना बाकी है।',
  },
  mr: {
    back: '← मागे',
    tagline: 'तुमचा आवाज. आमचे प्राधान्य.',
    headline: <>उज्ज्वल उद्यासाठी<br />एकत्र येऊया</>,
    description: <>समस्या नोंदवा. प्रगती पाहा.<br />समुदाय अधिक सक्षम बनवा.</>,
    features: ['सहज तक्रार नोंदवा', 'प्रत्येक अपडेट पाहा', 'समुदाय अधिक सक्षम बनवा'],
    citizen: 'मी नागरिक आहे',
    worker: 'फील्ड वर्कर',
    admin: 'प्रशासक',
    citizenDescription: 'तक्रारी नोंदवा, स्थिती तपासा आणि सार्वजनिक सेवांचा लाभ घ्या.',
    login: 'लॉगिन',
    google: 'Google सह पुढे जा',
    or: 'किंवा',
    nameOrEmail: 'पूर्ण नाव / नोंदणीकृत ईमेल',
    email: 'ईमेल पत्ता',
    emailPlaceholder: 'तुमचा ईमेल टाका',
    password: 'पासवर्ड',
    passwordPlaceholder: 'तुमचा पासवर्ड टाका',
    showPassword: 'पासवर्ड दाखवा',
    forgot: 'पासवर्ड विसरलात?',
    newHere: 'नवीन आहात?',
    createAccount: 'खाते तयार करा',
    already: 'आधीच नोंदणी केली आहे?',
    confirmPassword: 'पासवर्डची पुष्टी करा',
    phone: 'मोबाइल नंबर',
    fullName: 'पूर्ण नाव',
    loginId: 'लॉगिन आयडी',
    support: 'सहाय्याशी संपर्क साधा',
    mismatch: 'पासवर्ड जुळत नाहीत.',
    signupNotice: 'नोंदणी बॅकएंडशी जोडणे बाकी आहे.',
    loginNotice: 'लॉगिन बॅकएंडशी जोडणे बाकी आहे.',
    googleNotice: 'Google लॉगिनसाठी OAuth सेटअप आवश्यक आहे.',
    forgotNotice: 'पासवर्ड रिकव्हरी बॅकएंडशी जोडणे बाकी आहे.',
  },
}

const roleConfig = {
  citizen: { title: 'citizen', image: '/images/roles/citizen.png' },
  worker: { title: 'worker', image: '/images/roles/field-worker.png' },
  admin: { title: 'admin', image: '/images/roles/administrator.png' },
}

function FeatureIcon({ type }) {
  if (type === 'report') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z M15 3v5h4 M9 12h7 M9 16h7" /></svg>
  }
  if (type === 'track') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V11h4v9 M10 20V5h4v15 M16 20v-8h4v8 M3 21h18" /></svg>
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M16 12a2.5 2.5 0 1 0 0-5 M3 20v-2a5 5 0 0 1 10 0v2z M15 16a4 4 0 0 1 6 3v1h-5" /></svg>
}

export default function LoginPage({ role = 'admin', onBack, onAuthenticated }) {
  const { language, setLanguage } = useLanguage()
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', phone: '', id: '', password: '', confirmPassword: '',
  })
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const safeRole = roleConfig[role] ? role : 'admin'
  const roleInfo = roleConfig[safeRole]
  const t = copy[language] ?? copy.en
  const isCitizen = safeRole === 'citizen'
  const isSignup = isCitizen && creatingAccount
  const roleTitle = safeRole === 'citizen' ? t.citizen : safeRole === 'worker' ? t.worker : t.admin

  function updateField(event) {
    setForm(current => ({ ...current, [event.target.name]: event.target.value }))
    setMessage('')
  }

  async function handleSubmit(event) {
  event.preventDefault()
  setMessage('')

  if (submitting) return

  if (isSignup) {
    if (form.password.length < 12) {
      setMessage('Password must contain at least 12 characters.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setMessage(t.mismatch)
      return
    }
  }

  setSubmitting(true)

  try {
    const result = isSignup
      ? await registerCitizen({
          full_name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
        })
      : await loginUser({
          email: form.email,
          password: form.password,
        })

    if (result.user.role !== safeRole) {
      setMessage(
        'This account does not have the selected role. Please go back and choose the correct role.'
      )
      return
    }

    localStorage.setItem('gramseva_token', result.access_token)
    localStorage.setItem('gramseva_user', JSON.stringify(result.user))

    if (onAuthenticated) {
      onAuthenticated(result)
    } else {
      setMessage(isSignup ? 'Account created successfully!' : 'Login successful!')
    }
  } catch (error) {
    setMessage(error.message || 'Unable to complete your request.')
  } finally {
    setSubmitting(false)
  }
}

  return (
    <main className={`auth-page auth-page--${safeRole}`}>
      <section className="auth-left">
        <button className="auth-back" type="button" onClick={onBack}>{t.back}</button>

        <header className="auth-brand">
          <img src="/images/gramseva-logo.png" alt="GramSeva logo" />
          <h1>GramSeva</h1>
          <p>{t.tagline}</p>
        </header>

        <div className="auth-intro">
          <h2>{t.headline}</h2>
          <span className="auth-leaf-divider" aria-hidden="true"><i /></span>
          <p>{t.description}</p>

          <div className="auth-features">
            <div className="auth-feature">
              <span className="auth-feature-icon auth-feature-icon--green"><FeatureIcon type="report" /></span>
              <span>{t.features[0]}</span>
            </div>
            <div className="auth-feature">
              <span className="auth-feature-icon auth-feature-icon--gold"><FeatureIcon type="track" /></span>
              <span>{t.features[1]}</span>
            </div>
            <div className="auth-feature">
              <span className="auth-feature-icon auth-feature-icon--blue"><FeatureIcon type="community" /></span>
              <span>{t.features[2]}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-right">
        <div className="auth-language">
          <LanguageSelector language={language} onChange={value => {
            setLanguage(value)
            setMessage('')
          }} />
        </div>

        <form className="auth-card" onSubmit={handleSubmit}>
          <header className="auth-role-header">
            <div className="auth-role-icon">
              <img src={roleInfo.image} alt="" />
              <span className="auth-role-fallback" aria-hidden="true">●</span>
            </div>
            <h2>{isSignup ? t.createAccount : roleTitle}</h2>
            <p>{isCitizen ? t.citizenDescription : t.loginNotice}</p>
          </header>

          {!isSignup && <h3 className="auth-form-heading">{t.login}</h3>}

          {isCitizen && !isSignup && (
            <>
              <button className="auth-google-button" type="button" onClick={() => setMessage(t.googleNotice)}>
                <svg className="auth-google-mark" viewBox="0 0 48 48" aria-hidden="true">
  <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15z"/>
  <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44z"/>
  <path fill="#FBBC05" d="M12.6 27.7a12 12 0 0 1 0-7.4V15H5.8a20 20 0 0 0 0 18z"/>
  <path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6 29.5 4 24 4A20 20 0 0 0 5.8 15l6.8 5.3c1.6-4.8 6.1-8.2 11.4-8.2z"/>
</svg>
                {t.google}
              </button>
              <div className="auth-divider"><span>{t.or}</span></div>
            </>
          )}

          {isSignup && (
            <input className="auth-input auth-standalone-input" name="name" value={form.name} onChange={updateField} placeholder={t.fullName} aria-label={t.fullName} autoComplete="name" required />
          )}

          <label className="auth-input-wrap">
            {isCitizen && !isSignup && <span className="auth-field-symbol" aria-hidden="true">✉</span>}
            <input className="auth-input" name="email" type="email" value={form.email} onChange={updateField} placeholder={t.emailPlaceholder} aria-label={t.email} autoComplete="username" required />
          </label>

          {isSignup && (
            <input className="auth-input auth-standalone-input" name="phone" type="tel" value={form.phone} onChange={updateField} placeholder={t.phone} aria-label={t.phone} autoComplete="tel" required />
          )}

          {(!isCitizen || isSignup) && (
            <label className="auth-input-wrap">
              <input className="auth-input" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={updateField} placeholder={t.passwordPlaceholder} aria-label={t.password} autoComplete={isSignup ? 'new-password' : 'current-password'} minLength={isSignup ? 12 : undefined} required />
              <button className="auth-password-toggle" type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Hide' : 'Show'}</button>
            </label>
          )}

          {isSignup && (
            <input className="auth-input auth-standalone-input" name="confirmPassword" type="password" value={form.confirmPassword} onChange={updateField} placeholder={t.confirmPassword} aria-label={t.confirmPassword} autoComplete="new-password" minLength={12} required />
          )}

          {isCitizen && !isSignup && (
            <label className="auth-input-wrap">
              <input className="auth-input" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={updateField} placeholder={t.passwordPlaceholder} aria-label={t.password} autoComplete="current-password" required />
              <button className="auth-password-toggle" type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Hide' : 'Show'}</button>
            </label>
          )}

          <button className="auth-submit-button" type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : isSignup ? t.createAccount : t.login}<span aria-hidden="true">→</span>
          </button>

          {message && <p className="auth-message" role="status">{message}</p>}

          {isCitizen && !isSignup && (
            <button className="auth-forgot" type="button" onClick={() => setMessage(t.forgotNotice)}>{t.forgot}</button>
          )}

          {isCitizen && (
            <button className="auth-create-card" type="button" onClick={() => {
              setCreatingAccount(value => !value)
              setMessage('')
            }}>
              <span className="auth-create-icon" aria-hidden="true">{isSignup ? '←' : '+'}</span>
              <span className="auth-create-copy">
                <small>{isSignup ? t.already : t.newHere}</small>
                <strong>{isSignup ? t.login : t.createAccount}</strong>
              </span>
              <span className="auth-create-arrow" aria-hidden="true">→</span>
            </button>
          )}

          {!isCitizen && <a className="auth-support" href="mailto:support@gramseva.example">{t.support}</a>}
        </form>
      </section>
    </main>
  )
}
