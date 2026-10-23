
import { useLanguage } from '../i18n/index.jsx'

const languages = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'mr', label: 'मराठी' },
]

export default function LanguageSelector({ language, onChange }) {
  const shared = useLanguage()
  const selectedLanguage = language ?? shared.language
  const handleChange = onChange ?? shared.setLanguage

  return (
    <label className="language-selector">
      <span aria-hidden="true">◎</span>
      <span className="sr-only">Choose language</span>
      <select
        value={selectedLanguage}
        onChange={(event) => handleChange(event.target.value)}
        aria-label="Choose language"
      >
        {languages.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  )
}
