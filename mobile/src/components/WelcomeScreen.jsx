
import RoleCard from './RoleCard.jsx'
import LanguageSelector from './LanguageSelector.jsx'
import { useLanguage } from '../i18n/index.jsx'

const translations = {
  en: {
    brand: 'GramSeva',
    tagline: 'Your Voice. Our Priority.',
    welcome: 'Welcome to GramSeva',
    subtitle: 'Empowering villages, one voice at a time.',
    choose: 'How would you like to continue?',
    citizen: 'Citizen',
    citizenDesc: 'Raise complaints and track local issues.',
    worker: 'Field Worker',
    workerDesc: 'View assigned work and update its progress.',
    admin: 'Administrator',
    adminDesc: 'Manage services, teams, and community requests.',
    continue: 'Continue',
    footer: 'Together, building stronger villages.',
  },
  hi: {
    brand: 'ग्रामसेवा',
    tagline: 'आपकी आवाज़। हमारी प्राथमिकता।',
    welcome: 'ग्रामसेवा में आपका स्वागत है',
    subtitle: 'एक आवाज़ से गाँव को सशक्त बनाना।',
    choose: 'आप कैसे आगे बढ़ना चाहेंगे?',
    citizen: 'नागरिक',
    citizenDesc: 'शिकायत दर्ज करें और स्थानीय समस्याओं की स्थिति देखें।',
    worker: 'फील्ड वर्कर',
    workerDesc: 'सौंपे गए कार्य देखें और उनकी प्रगति अपडेट करें।',
    admin: 'प्रशासक',
    adminDesc: 'सेवाओं, टीमों और सामुदायिक अनुरोधों का प्रबंधन करें।',
    continue: 'आगे बढ़ें',
    footer: 'मिलकर मजबूत गाँव बनाएँ।',
  },
  mr: {
    brand: 'ग्रामसेवा',
    tagline: 'तुमचा आवाज. आमचे प्राधान्य.',
    welcome: 'ग्रामसेवामध्ये आपले स्वागत आहे',
    subtitle: 'प्रत्येक आवाजातून गावाला सक्षम बनवूया.',
    choose: 'तुम्हाला पुढे कसे जायचे आहे?',
    citizen: 'नागरिक',
    citizenDesc: 'तक्रारी नोंदवा आणि स्थानिक समस्यांचा मागोवा घ्या.',
    worker: 'फील्ड वर्कर',
    workerDesc: 'नेमून दिलेली कामे पाहा आणि प्रगती अपडेट करा.',
    admin: 'प्रशासक',
    adminDesc: 'सेवा, टीम आणि समुदायाच्या विनंत्या व्यवस्थापित करा.',
    continue: 'पुढे चला',
    footer: 'एकत्र येऊन सक्षम गावे घडवूया.',
  },
}

export default function WelcomeScreen({ onRoleSelect }) {
  const { language, setLanguage } = useLanguage()
  const t = translations[language] ?? translations.en

  const roles = [
    {
      id: 'citizen',
      title: t.citizen,
      description: t.citizenDesc,
      image: '/images/roles/citizen.png',
      variant: 'citizen',
    },
    {
      id: 'worker',
      title: t.worker,
      description: t.workerDesc,
      image: '/images/roles/field-worker.png',
      variant: 'worker',
    },
    {
      id: 'admin',
      title: t.admin,
      description: t.adminDesc,
      image: '/images/roles/administrator.png',
      variant: 'admin',
    },
  ]

  function handleRoleSelect(role) {
    if (onRoleSelect) onRoleSelect(role)
  }

  return (
    <main className="welcome-page">
      <LanguageSelector
        language={language}
        onChange={setLanguage}
      />

      <header className="brand-header">
        <img
          className="brand-logo"
          src="/images/gramseva-logo.png"
          alt={`${t.brand} logo`}
        />

        <h1 className="brand-name">{t.brand}</h1>
        <p className="brand-tagline">{t.tagline}</p>
      </header>

      <section className="welcome-intro">
        <h2>{t.welcome}</h2>
        <p className="welcome-subtitle">{t.subtitle}</p>
        <p className="welcome-instruction">{t.choose}</p>
      </section>

      <section className="role-grid" aria-label={t.choose}>
        {roles.map((role) => (
          <RoleCard
            key={role.id}
            image={role.image}
            title={role.title}
            description={role.description}
            buttonText={t.continue}
            variant={role.variant}
            onClick={() => handleRoleSelect(role.id)}
          />
        ))}
      </section>

      <footer className="welcome-footer">
        <p>{t.footer}</p>
      </footer>

      <div className="village-landscape" aria-hidden="true">
        <div className="village-hill village-hill--back" />
        <div className="village-hill village-hill--front" />
        <div className="village-sun" />
        <div className="village-house village-house--one">
          <span />
        </div>
        <div className="village-house village-house--two">
          <span />
        </div>
        <div className="village-tree village-tree--one" />
        <div className="village-tree village-tree--two" />
        <div className="village-road" />
      </div>
    </main>
  )
}
