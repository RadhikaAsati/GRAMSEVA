
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createCitizenFeedback,
  createComplaint,
  getComplaints,
  translateComplaint,
  getComplaintCaseHistory,
  uploadComplaintPhoto,
  understandComplaintDraft,
} from '../services/api.js'
import LanguageSelector from '../components/LanguageSelector.jsx'
import IssueLocationPicker from '../components/IssueLocationPicker.jsx'
import { useLanguage } from '../i18n/index.jsx'

const categories = [
  { value: 'Roads', key: 'roads' },
  { value: 'Water Supply', key: 'water' },
  { value: 'Electricity', key: 'electricity' },
  { value: 'Sanitation', key: 'sanitation' },
  { value: 'Street Lights', key: 'streetLights' },
  { value: 'Drainage', key: 'drainage' },
  { value: 'Other', key: 'other' },
]

const copy = {
  en: {
    tagline: 'Your village, your voice',
    menu: 'MENU',
    home: 'Home',
    typeComplaint: 'Type a Complaint',
    voiceInput: 'Voice Input',
    myComplaints: 'My Complaints',
    settings: 'Settings',
    citizenAccount: 'Citizen account',
    logout: 'Log out',
    portal: 'Citizen Portal',
    namaste: 'Namaste',
    citizen: 'Citizen',
    eyebrow: 'YOUR VOICE MATTERS',
    villageMessage: 'Let’s make our village better, together.',
    register: 'Register a Complaint',
    helpToday: 'How can we help you today?',
    helpSubtitle: 'Choose how you’d like to tell us about an issue in your village.',
    help: 'WE’RE HERE TO HELP',
    speak: 'Speak your complaint',
    speakHelp: 'Tell us what happened in your own language.',
    useVoice: 'Use voice →',
    type: 'Type your complaint',
    typeHelp: 'Write the details of the issue you’re facing.',
    write: 'Write complaint →',
    issue: 'Tell us about the issue',
    close: 'Close form',
    title: 'Complaint title',
    titlePlaceholder: 'e.g. Damaged road near the school',
    category: 'Issue category',
    description: 'Description',
    descriptionPlaceholder: 'Describe the issue and where it is happening…',
    complaintLanguage: 'Preferred complaint language',
    english: 'English',
    hindi: 'Hindi',
    marathi: 'Marathi',
    cancel: 'Cancel',
    submit: 'Submit complaint →',
    submitting: 'Submitting…',
    voiceAssistant: 'VOICE ASSISTANT',
    speakOwn: 'Speak in your own language',
    voiceHelp: 'Choose Marathi or Hindi and use your device’s microphone to dictate your complaint.',
    startSpeaking: 'Start speaking',
    voiceUnsupported: 'Voice dictation is not supported by this browser. Please use the text complaint form.',
    voiceError: 'We could not capture speech. Please allow microphone access and try again.',
    transcript: 'Your speech has been transcribed. Review the text and submit your complaint.',
    reviewTranscript: 'Review the transcribed text before submitting.',
    voiceNote: 'Voice recognition depends on browser support and microphone permission.',
    textInstead: 'Enter complaint by text instead',
    account: 'YOUR ACCOUNT',
    profile: 'Settings & profile',
    preferredLanguage: 'Preferred language',
    languageHelp: 'Your selected language applies to the app interface and your account.',
    backComplaints: '← Back to My Complaints',
    progress: 'Progress',
    currentStatus: 'Current status',
    categoryLabel: 'Category',
    submitted: 'Submitted',
    complaintId: 'Complaint ID',
    keepTrack: 'KEEP TRACK',
    allComplaints: 'All My Complaints',
    follow: 'Follow the progress of issues you’ve reported.',
    viewAll: 'View all →',
    backHome: 'Back home',
    total: 'Total reports',
    inProgress: 'In progress',
    resolved: 'Resolved',
    loading: 'Loading your complaints…',
    noComplaints: 'No complaints yet',
    noComplaintsHelp: 'Your submitted complaints will appear here.',
    firstComplaint: 'Register your first complaint',
    refresh: '↻ Refresh complaints',
    refreshing: 'Refreshing…',
    latest: 'Latest updates',
    updatesHelp: 'Updates about your complaints will appear here.',
    community: 'YOUR COMMUNITY',
    communityTitle: 'Small actions, stronger villages.',
    communityHelp: 'Every report helps bring attention to local issues.',
    feedback: 'Your feedback matters',
    feedbackHelp: 'Help us improve public services for everyone.',
    review: 'Review my complaints →',
    success: 'Your complaint has been submitted successfully.',
    loadError: 'Could not load your complaints.',
    submitError: 'Could not submit your complaint.',
    dateUnavailable: 'Date unavailable',
    statusSubmitted: 'Submitted',
    statusInProgress: 'In Progress',
    statusResolved: 'Resolved',
    statusClosed: 'Closed',
    statusAwaitingIntervention: 'Awaiting intervention',
  },
  hi: {
    tagline: 'आपका गाँव, आपकी आवाज़',
    menu: 'मेनू',
    home: 'होम',
    typeComplaint: 'शिकायत लिखें',
    voiceInput: 'बोलकर बताएँ',
    myComplaints: 'मेरी शिकायतें',
    settings: 'सेटिंग्स',
    citizenAccount: 'नागरिक खाता',
    logout: 'लॉग आउट',
    portal: 'नागरिक पोर्टल',
    namaste: 'नमस्ते',
    citizen: 'नागरिक',
    eyebrow: 'आपकी आवाज़ महत्वपूर्ण है',
    villageMessage: 'आइए, मिलकर अपने गाँव को बेहतर बनाएँ।',
    register: 'शिकायत दर्ज करें',
    helpToday: 'आज हम आपकी क्या मदद कर सकते हैं?',
    helpSubtitle: 'अपने गाँव की समस्या बताने का तरीका चुनें।',
    help: 'हम आपकी मदद के लिए हैं',
    speak: 'बोलकर शिकायत बताएँ',
    speakHelp: 'अपनी भाषा में बताएँ कि क्या हुआ।',
    useVoice: 'आवाज़ का उपयोग करें →',
    type: 'शिकायत लिखें',
    typeHelp: 'आप जिस समस्या का सामना कर रहे हैं, उसका विवरण लिखें।',
    write: 'शिकायत लिखें →',
    issue: 'समस्या के बारे में बताएँ',
    close: 'फ़ॉर्म बंद करें',
    title: 'शिकायत का शीर्षक',
    titlePlaceholder: 'जैसे: स्कूल के पास सड़क खराब है',
    category: 'समस्या की श्रेणी',
    description: 'विवरण',
    descriptionPlaceholder: 'समस्या और उसका स्थान बताएँ…',
    complaintLanguage: 'शिकायत की भाषा',
    english: 'अंग्रेज़ी',
    hindi: 'हिंदी',
    marathi: 'मराठी',
    cancel: 'रद्द करें',
    submit: 'शिकायत भेजें →',
    submitting: 'भेज रहे हैं…',
    voiceAssistant: 'आवाज़ सहायक',
    speakOwn: 'अपनी भाषा में बोलें',
    voiceHelp: 'मराठी या हिंदी चुनें और शिकायत बोलकर दर्ज करने के लिए माइक्रोफ़ोन का उपयोग करें।',
    startSpeaking: 'बोलना शुरू करें',
    voiceUnsupported: 'इस ब्राउज़र में आवाज़ से लिखना उपलब्ध नहीं है। कृपया शिकायत लिखें।',
    voiceError: 'आवाज़ दर्ज नहीं हो सकी। माइक्रोफ़ोन की अनुमति देकर फिर कोशिश करें।',
    transcript: 'आपकी आवाज़ लिखित रूप में बदल गई है। भेजने से पहले जाँच लें।',
    reviewTranscript: 'शिकायत भेजने से पहले लिखे गए पाठ की जाँच करें।',
    voiceNote: 'आवाज़ पहचानना ब्राउज़र और माइक्रोफ़ोन की अनुमति पर निर्भर करता है।',
    textInstead: 'शिकायत लिखकर दर्ज करें',
    account: 'आपका खाता',
    profile: 'सेटिंग्स और प्रोफ़ाइल',
    preferredLanguage: 'पसंदीदा भाषा',
    languageHelp: 'आपकी चुनी हुई भाषा ऐप और आपके खाते पर लागू होगी।',
    backComplaints: '← मेरी शिकायतों पर वापस जाएँ',
    progress: 'प्रगति',
    currentStatus: 'वर्तमान स्थिति',
    categoryLabel: 'श्रेणी',
    submitted: 'जमा करने की तारीख',
    complaintId: 'शिकायत संख्या',
    keepTrack: 'प्रगति देखें',
    allComplaints: 'मेरी सभी शिकायतें',
    follow: 'आपकी दर्ज की गई शिकायतों की प्रगति देखें।',
    viewAll: 'सभी देखें →',
    backHome: 'होम पर वापस जाएँ',
    total: 'कुल शिकायतें',
    inProgress: 'प्रगति में',
    resolved: 'हल हुईं',
    loading: 'आपकी शिकायतें लोड हो रही हैं…',
    noComplaints: 'अभी कोई शिकायत नहीं है',
    noComplaintsHelp: 'आपकी दर्ज की गई शिकायतें यहाँ दिखाई देंगी।',
    firstComplaint: 'पहली शिकायत दर्ज करें',
    refresh: '↻ शिकायतें रीफ़्रेश करें',
    refreshing: 'रीफ़्रेश हो रहा है…',
    latest: 'नवीनतम अपडेट',
    updatesHelp: 'आपकी शिकायतों के अपडेट यहाँ दिखाई देंगे।',
    community: 'आपका समुदाय',
    communityTitle: 'छोटे कदम, मजबूत गाँव।',
    communityHelp: 'हर शिकायत स्थानीय समस्याओं पर ध्यान दिलाती है।',
    feedback: 'आपकी राय महत्वपूर्ण है',
    feedbackHelp: 'सार्वजनिक सेवाओं को बेहतर बनाने में मदद करें।',
    review: 'मेरी शिकायतें देखें →',
    success: 'आपकी शिकायत सफलतापूर्वक दर्ज हो गई है।',
    loadError: 'आपकी शिकायतें लोड नहीं हो सकीं।',
    submitError: 'शिकायत दर्ज नहीं हो सकी।',
    dateUnavailable: 'तारीख उपलब्ध नहीं',
    statusSubmitted: 'दर्ज की गई',
    statusInProgress: 'काम जारी है',
    statusResolved: 'समस्या हल हो गई',
    statusClosed: 'बंद की गई',
    statusAwaitingIntervention: 'कारवाईची वाट पाहत आहे',
    statusAwaitingIntervention: 'कार्रवाई का इंतज़ार है',
  },
  mr: {
    tagline: 'तुमचे गाव, तुमचा आवाज',
    menu: 'मेनू',
    home: 'मुख्यपृष्ठ',
    typeComplaint: 'तक्रार लिहा',
    voiceInput: 'बोलून सांगा',
    myComplaints: 'माझ्या तक्रारी',
    settings: 'सेटिंग्ज',
    citizenAccount: 'नागरिक खाते',
    logout: 'बाहेर पडा',
    portal: 'नागरिक पोर्टल',
    namaste: 'नमस्कार',
    citizen: 'नागरिक',
    eyebrow: 'तुमचा आवाज महत्त्वाचा आहे',
    villageMessage: 'चला, मिळून आपले गाव अधिक चांगले बनवूया.',
    register: 'तक्रार नोंदवा',
    helpToday: 'आज आम्ही तुमची कशी मदत करू शकतो?',
    helpSubtitle: 'तुमच्या गावातील समस्या सांगण्याचा मार्ग निवडा.',
    help: 'आम्ही मदतीसाठी आहोत',
    speak: 'बोलून तक्रार सांगा',
    speakHelp: 'तुमच्या भाषेत काय घडले ते सांगा.',
    useVoice: 'आवाज वापरा →',
    type: 'तक्रार लिहा',
    typeHelp: 'तुम्हाला येत असलेल्या समस्येचा तपशील लिहा.',
    write: 'तक्रार लिहा →',
    issue: 'समस्येबद्दल माहिती द्या',
    close: 'फॉर्म बंद करा',
    title: 'तक्रारीचे शीर्षक',
    titlePlaceholder: 'उदा. शाळेजवळील रस्ता खराब आहे',
    category: 'समस्येचा प्रकार',
    description: 'तपशील',
    descriptionPlaceholder: 'समस्या आणि तिचे ठिकाण सांगा…',
    complaintLanguage: 'तक्रारीची भाषा',
    english: 'इंग्रजी',
    hindi: 'हिंदी',
    marathi: 'मराठी',
    cancel: 'रद्द करा',
    submit: 'तक्रार पाठवा →',
    submitting: 'पाठवत आहे…',
    voiceAssistant: 'आवाज सहाय्यक',
    speakOwn: 'तुमच्या भाषेत बोला',
    voiceHelp: 'मराठी किंवा हिंदी निवडा आणि तक्रार बोलून नोंदवण्यासाठी मायक्रोफोन वापरा.',
    startSpeaking: 'बोलायला सुरुवात करा',
    voiceUnsupported: 'या ब्राउझरमध्ये आवाजातून मजकूर लिहिण्याची सुविधा नाही. कृपया तक्रार लिहा.',
    voiceError: 'आवाज नोंदवता आला नाही. मायक्रोफोनची परवानगी देऊन पुन्हा प्रयत्न करा.',
    transcript: 'तुमचे बोलणे मजकुरात बदलले आहे. पाठवण्यापूर्वी तपासा.',
    reviewTranscript: 'तक्रार पाठवण्यापूर्वी मजकूर तपासा.',
    voiceNote: 'आवाज ओळखण्याची सुविधा ब्राउझर आणि मायक्रोफोनच्या परवानगीवर अवलंबून आहे.',
    textInstead: 'तक्रार मजकूर स्वरूपात नोंदवा',
    account: 'तुमचे खाते',
    profile: 'सेटिंग्ज आणि प्रोफाइल',
    preferredLanguage: 'आवडती भाषा',
    languageHelp: 'तुमची निवडलेली भाषा अॅप आणि खात्यावर लागू होईल.',
    backComplaints: '← माझ्या तक्रारींकडे परत जा',
    progress: 'प्रगती',
    currentStatus: 'सध्याची स्थिती',
    categoryLabel: 'प्रकार',
    submitted: 'नोंदवले',
    complaintId: 'तक्रार क्रमांक',
    keepTrack: 'प्रगती पाहा',
    allComplaints: 'माझ्या सर्व तक्रारी',
    follow: 'तुम्ही नोंदवलेल्या समस्यांची प्रगती पाहा.',
    viewAll: 'सर्व पाहा →',
    backHome: 'मुख्यपृष्ठावर जा',
    total: 'एकूण तक्रारी',
    inProgress: 'प्रगतीत',
    resolved: 'निकाली',
    loading: 'तुमच्या तक्रारी लोड होत आहेत…',
    noComplaints: 'अजून तक्रारी नाहीत',
    noComplaintsHelp: 'तुमच्या नोंदवलेल्या तक्रारी येथे दिसतील.',
    firstComplaint: 'पहिली तक्रार नोंदवा',
    refresh: '↻ तक्रारी पुन्हा लोड करा',
    refreshing: 'पुन्हा लोड होत आहे…',
    latest: 'नवीन अपडेट',
    updatesHelp: 'तुमच्या तक्रारींचे अपडेट येथे दिसतील.',
    community: 'तुमचा समुदाय',
    communityTitle: 'छोटी पावले, सक्षम गावे.',
    communityHelp: 'प्रत्येक तक्रार स्थानिक समस्यांकडे लक्ष वेधते.',
    feedback: 'तुमचे मत महत्त्वाचे आहे',
    feedbackHelp: 'सार्वजनिक सेवा सुधारण्यास मदत करा.',
    review: 'माझ्या तक्रारी पाहा →',
    success: 'तुमची तक्रार यशस्वीपणे नोंदवली आहे.',
    loadError: 'तुमच्या तक्रारी लोड करता आल्या नाहीत.',
    submitError: 'तक्रार नोंदवता आली नाही.',
    dateUnavailable: 'तारीख उपलब्ध नाही',
    statusSubmitted: 'नोंदवलेली',
    statusInProgress: 'प्रगतीत',
    statusResolved: 'निकाली',
    statusClosed: 'बंद की गई',
  },
}


function citizenCategoryLabel(value, language) {
  const labels = {
    hi: {
      Roads: 'सड़क',
      'Water Supply': 'पानी की सप्लाई',
      Electricity: 'बिजली',
      Sanitation: 'सफाई',
      'Street Lights': 'स्ट्रीट लाइट',
      Drainage: 'नाली',
      Other: 'अन्य',
      streetlight: 'स्ट्रीट लाइट',
      streetlights: 'स्ट्रीट लाइट',
      roads: 'सड़क',
      water: 'पानी',
      electricity: 'बिजली',
      sanitation: 'सफाई',
      drainage: 'नाली',
    },
  }
  return labels[language]?.[String(value || '').trim()]
    || String(value || 'Other').replace(/\b\w/g, letter => letter.toUpperCase())
}

function labelStatus(status, t) {
  const normalized = String(status || 'submitted')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .trim()

  if (normalized === 'submitted') return t.statusSubmitted
  if (normalized === 'in progress') return t.statusInProgress
  if (normalized === 'resolved') return t.statusResolved
  if (normalized === 'closed') return t.statusClosed
  if (normalized === 'awaiting intervention') return t.statusAwaitingIntervention

  return normalized.replace(/\b\w/g, letter => letter.toUpperCase())
}

function statusClass(status) {
  return String(status || 'submitted')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
}

function formatDate(value, language, includeTime = false) {
  if (!value) return '—'

  const locale = {
    en: 'en-IN',
    hi: 'hi-IN',
    mr: 'mr-IN',
  }[language] || 'en-IN'

  try {
    return new Date(value).toLocaleString(locale, includeTime
      ? { dateStyle: 'medium', timeStyle: 'short' }
      : { dateStyle: 'medium' })
  } catch {
    return '—'
  }
}

export default function CitizenDashboard({ user, token, onLogout }) {
  const { language, setLanguage, t: sharedT } = useLanguage()
  const tr = copy[language] || copy.en

  const getComplaintDisplay = (complaint, field) => {
    if (!complaint) return ''
    const key = `${complaint.id}:${language}`
    const translated = translatedComplaints[key]
    if (!translated) return complaint[field] || ''
    if (field === 'title') {
      return translated.translated_title || complaint.title || ''
    }
    if (field === 'description') {
      return translated.translation || complaint.description || ''
    }
    return complaint[field] || ''
  }

  const [complaints, setComplaints] = useState([])
  const [translatedComplaints, setTranslatedComplaints] = useState({})
  const translationCacheRef = useRef(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [activeView, setActiveView] = useState('Home')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [showVoiceReviewDialog, setShowVoiceReviewDialog] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [voiceOrigin, setVoiceOrigin] = useState(false)
  const recognitionRef = useRef(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const photoInputRef = useRef(null)
  const [complaintLocation, setComplaintLocation] = useState(null)
  const [locationMessage, setLocationMessage] = useState('')
  const [issueDetails, setIssueDetails] = useState({
    village: '',
    ward: '',
    landmark: '',
  })

  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [caseHistory, setCaseHistory] = useState(null)
  const [caseHistoryLoading, setCaseHistoryLoading] = useState(false)
  const [caseHistoryError, setCaseHistoryError] = useState('')

  const [feedbackOutcome, setFeedbackOutcome] = useState('resolved')
  const [feedbackComments, setFeedbackComments] = useState('')
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [feedbackNotice, setFeedbackNotice] = useState('')
  const [feedbackError, setFeedbackError] = useState('')
  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview('')
      return undefined
    }

    const previewUrl = URL.createObjectURL(photoFile)
    setPhotoPreview(previewUrl)

    return () => URL.revokeObjectURL(previewUrl)
  }, [photoFile])


  const [form, setForm] = useState({
    title: '',
    category: 'Roads',
    description: '',
    original_language: user?.preferred_language || language || 'en',
  })

  const loadComplaints = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await getComplaints(token)
      setComplaints(Array.isArray(result) ? result : [])
    } catch (err) {
      setError(err.message || tr.loadError)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadComplaints()
  }, [loadComplaints])

  useEffect(() => {
    if (!token || !complaints.length) return undefined
    let cancelled = false

    async function translateLoadedComplaints() {
      for (const complaint of complaints) {
        const sourceLanguage = String(
          complaint.original_language || 'en'
        ).toLowerCase()

        if (sourceLanguage === language) continue

        const key = `${complaint.id}:${language}`
        const cached = translationCacheRef.current.get(key)

        if (cached) {
          if (!cancelled) {
            setTranslatedComplaints(previous => ({
              ...previous,
              [key]: cached,
            }))
          }
          continue
        }

        try {
          const result = await translateComplaint(
            token,
            complaint.id,
            language,
          )

          if (result && (result.translation || result.translated_title)) {
            translationCacheRef.current.set(key, result)
            if (!cancelled) {
              setTranslatedComplaints(previous => ({
                ...previous,
                [key]: result,
              }))
            }
          }
        } catch (err) {
          // Keep the original complaint visible if translation is unavailable.
          console.warn(
            `Translation unavailable for complaint ${complaint.id} (${language}).`,
            err.message,
          )
        }

        if (cancelled) return
      }
    }

    translateLoadedComplaints()
    return () => {
      cancelled = true
    }
  }, [complaints, language, token])
async function analyzeComplaintDraft() {
  if (!form.description.trim()) {
    setAiError('Please describe the issue or record your complaint by voice first.')
    return
  }
  setAiLoading(true)
  setAiError('')
  setAiAnalysis(null)

  try {
    const result = await understandComplaintDraft(token, {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      original_language: form.original_language,
    })

    setAiAnalysis(result.analysis)
  } catch (err) {
    setAiError(
      err.message ||
      'AI understanding is temporarily unavailable. You can still submit your complaint.',
    )
  } finally {
    setAiLoading(false)
  }
}


  useEffect(() => {
  if (!selectedComplaint?.id || !token) {
    setCaseHistory(null)
    setCaseHistoryError('')
    setCaseHistoryLoading(false)
    return
  }

  let cancelled = false

  async function loadCaseHistory() {
    setCaseHistoryLoading(true)
    setCaseHistoryError('')
    setCaseHistory(null)

    try {
      const result = await getComplaintCaseHistory(
        token,
        selectedComplaint.id,
      )

      if (!cancelled) {
        setCaseHistory(result)
      }
    } catch (err) {
      if (!cancelled) {
        setCaseHistoryError(
          err.message || 'Unable to load complaint history.',
        )
      }
    } finally {
      if (!cancelled) {
        setCaseHistoryLoading(false)
      }
    }
  }

  loadCaseHistory()

  return () => {
    cancelled = true
  }
}, [selectedComplaint?.id, token])
  async function submitCitizenFeedback() {
    if (!selectedComplaint?.id || !token || feedbackSubmitting) return

    setFeedbackSubmitting(true)
    setFeedbackNotice('')
    setFeedbackError('')

    try {
      await createCitizenFeedback(token, {
        complaint_id: selectedComplaint.id,
        outcome: feedbackOutcome,
        comments: feedbackComments.trim() || null,
      })

      setFeedbackNotice('Thank you! Your feedback has been submitted.')
      setFeedbackComments('')

      const refreshedHistory = await getComplaintCaseHistory(
        token,
        selectedComplaint.id,
      )
      setCaseHistory(refreshedHistory)

      // Refresh complaint status because feedback may update it.
      await loadComplaints()
    } catch (err) {
      setFeedbackError(
        err.message || 'Unable to submit feedback. Please try again.',
      )
    } finally {
      setFeedbackSubmitting(false)
    }
  }

  async function submitComplaint(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setNotice('')

    try {
      const created = await createComplaint(token, {
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim(),
        original_language: form.original_language,
        input_method: voiceOrigin ? 'voice' : 'text',
        ...(complaintLocation || {}),
        village: issueDetails.village.trim() || null,
        ward: issueDetails.ward.trim() || null,
        landmark: issueDetails.landmark.trim() || null,
      })

      let photoUploadError = ''
      if (photoFile && created?.id) {
        try {
          await uploadComplaintPhoto(token, created.id, photoFile)
        } catch (photoError) {
          photoUploadError = photoError.message || 'The complaint was submitted, but the photo upload failed.'
        }
      }

      setPhotoFile(null)
      if (photoInputRef.current) photoInputRef.current.value = ''
      setComplaintLocation(null)
      setLocationMessage('')
      setIssueDetails({
        village: '',
        ward: '',
        landmark: '',
      })

      setForm(current => ({
        ...current,
        title: '',
        description: '',
      }))
      setShowForm(false)
      setActiveView('My Complaints')
      setNotice(photoUploadError
        ? `${tr.success} Photo upload failed: ${photoUploadError}`
        : tr.success)

      await loadComplaints()

      if (created?.id) {
        setSelectedComplaint(created)
        setActiveView('Complaint Details')
      }
    } catch (err) {
      setError(err.message || tr.submitError)
    } finally {
      setSubmitting(false)
    }
  }

  const resolvedCount = complaints.filter(item =>
    ['resolved', 'closed'].includes(
      String(item.status || '').toLowerCase().replaceAll('_', ' ')
    )
  ).length

  const openCount = complaints.length - resolvedCount
  const canSubmitCitizenFeedback = (() => {
    const interventions = caseHistory?.interventions || []
    const feedback = caseHistory?.citizen_feedback || []

    if (!interventions.length) return false
    if (feedback.some((item) => item.outcome === 'resolved')) return false
    if (!feedback.length) return true

    const latestFeedbackTime = Math.max(
      ...feedback.map((item) => new Date(item.created_at).getTime()),
    )

    return interventions.some(
      (item) => new Date(item.created_at).getTime() > latestFeedbackTime,
    )
  })()

  const visibleComplaints = activeView === 'My Complaints'
    ? complaints
    : complaints.slice(0, 3)

  function navigate(view) {
    setActiveView(view)
    setShowForm(view === 'Type a Complaint')
    setSelectedComplaint(null)
    setNotice('')
    setError('')
  }

  const viewLabels = {
    Home: tr.home,
    'Type a Complaint': tr.typeComplaint,
    'Voice Input': tr.voiceInput,
    'My Complaints': tr.myComplaints,
    Settings: tr.settings,
    'Complaint Details': tr.myComplaints,
  }

  const categoryLabel = value =>
    tr[categories.find(item => item.value === value)?.key] || value

  function startVoiceRecognition() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError(tr.voiceUnsupported)
      return
    }

    if (isListening) return

    setError('')
    setNotice('')

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    const recognitionLocales = {
      en: 'en-IN',
      hi: 'hi-IN',
      mr: 'mr-IN',
    }

    recognition.lang = recognitionLocales[form.original_language] || 'mr-IN'
    recognition.interimResults = false
    recognition.continuous = false

    recognition.onstart = () => {
      setIsListening(true)
      setError('')
    }

    recognition.onresult = event => {
      console.log('[GRAMSEVA voice] recognition result received', event.results);
      const transcript = event.results?.[0]?.[0]?.transcript?.trim()

      if (!transcript) {
        setError(tr.voiceError)
        return
      }

      setVoiceOrigin(true)
      setAiAnalysis(null)
      setAiError('')
      setAiLoading(true)

      setForm(current => ({
        ...current,
        description: transcript,
        title: current.title || '',
      }))

      setShowForm(true)
      setActiveView('Type a Complaint')
      setNotice(tr.transcript)

      // Automatically analyze the recognized speech using the existing AI API.
      understandComplaintDraft(token, {
        title: '',
        description: transcript,
        category: form.category,
        original_language: form.original_language,
      })
        .then(result => {
          const analysis = result?.analysis
          if (!analysis) {
            setAiError('The complaint was transcribed, but AI did not return an analysis. You can still edit and submit it.')
            return
          }

          setAiAnalysis(analysis)
          setShowVoiceReviewDialog(true)
          setForm(current => ({
            ...current,
            title: analysis.issue_summary || current.title,
            category: analysis.suggested_category || current.category,
            // Preserve the original spoken words in the complaint field.
            description: transcript,
          }))

          setIssueDetails(current => ({
            ...current,
            village: analysis.village || current.village,
            ward: analysis.ward || current.ward,
            landmark: analysis.landmark || current.landmark,
          }))
        })
        .catch(err => {
          setAiError(
            err.message || 'AI understanding is unavailable. Your voice transcript is saved in the complaint form.',
          )
        })
        .finally(() => setAiLoading(false))
    }

    recognition.onerror = event => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone permission was denied. Allow microphone access in your browser settings and try again.')
      } else if (event.error === 'no-speech') {
        setError('No speech was detected. Try again in a quiet place and speak after recording starts.')
      } else if (event.error !== 'aborted') {
        setError(tr.voiceError)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    try {
      recognition.start()
    } catch {
      setIsListening(false)
      recognitionRef.current = null
      setError(tr.voiceError)
    }
  }

  function stopVoiceRecognition() {
    recognitionRef.current?.stop()
  }

  return (
    <main className="citizen-reference">
      <aside className="citizen-sidebar">
        <div className="reference-brand">
          <img src="/images/gramseva-logo.png" alt="GramSeva logo" />
          <div>
            <strong>GramSeva</strong>
            <span>{tr.tagline}</span>
          </div>
        </div>

        <div className="reference-side-art">
          <img src="/images/village-landscape.png" alt="" />
        </div>

        <p className="reference-nav-label">{tr.menu}</p>

        <nav className="reference-nav" aria-label={tr.portal}>
          {[
            ['Home', '⌂', tr.home],
            ['Type a Complaint', '＋', tr.typeComplaint],
            ['Voice Input', '♩', tr.voiceInput],
            ['My Complaints', '▤', tr.myComplaints],
            ['Settings', '⚙', tr.settings],
          ].map(([view, symbol, label]) => (
            <button
              key={view}
              type="button"
              className={`reference-nav-item ${activeView === view ? 'is-active' : ''}`}
              onClick={() => navigate(view)}
            >
              <span aria-hidden="true">{symbol}</span>
              {label}
            </button>
          ))}
        </nav>

        <div className="reference-sidebar-bottom">
          <div className="reference-user">
            <span className="reference-avatar">
              {(user?.full_name || 'C').trim().charAt(0).toUpperCase()}
            </span>
            <div>
              <strong>{user?.full_name || tr.citizen}</strong>
              <small>{tr.citizenAccount}</small>
            </div>
          </div>

          <button className="reference-logout" onClick={onLogout} type="button">
            ↪ {tr.logout}
          </button>
        </div>
      </aside>

      <section className="citizen-reference-main">
        <header className="reference-topbar">
          <div>
            <span className="reference-breadcrumb">{tr.portal}</span>
            <span className="reference-breadcrumb-separator"> / </span>
            <strong>{viewLabels[activeView] || tr.home}</strong>
          </div>

          <div className="reference-top-actions">
            <LanguageSelector language={language} onChange={setLanguage} />

            <button
              className="reference-profile-button"
              type="button"
              onClick={() => navigate('Settings')}
            >
              <span className="reference-avatar">
                {(user?.full_name || 'C').trim().charAt(0).toUpperCase()}
              </span>
              <span>{user?.full_name || tr.citizen}</span>
              <span aria-hidden="true">⌄</span>
            </button>
          </div>
        </header>

        <div className="reference-content">
          {activeView === 'Home' && (
            <section className="reference-hero">
              <div className="reference-hero-copy">
                <span className="reference-eyebrow">{tr.eyebrow}</span>
                <h1>
                  {tr.namaste}, {(user?.full_name || tr.citizen).trim().split(/\s+/)[0]}!
                  {' '}<span>🌿</span>
                </h1>
                <p>{tr.villageMessage}</p>
                <button
                  className="reference-primary"
                  type="button"
                  onClick={() => navigate('Type a Complaint')}
                >
                  + {tr.register} <span>→</span>
                </button>
              </div>
              <img
                src="/images/village-landscape.png"
                alt=""
                className="reference-hero-art"
              />
            </section>
          )}

          {notice && (
            <div className="reference-alert reference-alert-success" role="status">
              {notice}
            </div>
          )}
          {error && (
            <div className="reference-alert reference-alert-error" role="alert">
              {error}
            </div>
          )}

          {(activeView === 'Home' || activeView === 'Type a Complaint') && (
            <section className="reference-report-card">
              <div className="reference-card-heading">
                <div>
                  <span className="reference-section-kicker">{tr.help}</span>
                  <h2>
                    {activeView === 'Home' ? tr.helpToday : tr.register}
                  </h2>
                  <p>{tr.helpSubtitle}</p>
                </div>
                <span className="reference-heading-icon">✳</span>
              </div>

              <div className="reference-report-options">
                <button
                  className="reference-report-option reference-voice-option"
                  type="button"
                  onClick={() => navigate('Voice Input')}
                >
                  <span className="reference-option-icon">🎙</span>
                  <span>
                    <strong>{tr.speak}</strong>
                    <small>{tr.speakHelp}</small>
                    <b>{tr.useVoice}</b>
                  </span>
                </button>

                <button
                  className="reference-report-option reference-text-option"
                  type="button"
                  onClick={() => navigate('Type a Complaint')}
                >
                  <span className="reference-option-icon">✎</span>
                  <span>
                    <strong>{tr.type}</strong>
                    <small>{tr.typeHelp}</small>
                    <b>{tr.write}</b>
                  </span>
                </button>
              </div>

              {showForm && (
                <form className="reference-complaint-form" onSubmit={submitComplaint}>
                  <div className="reference-form-title">
                    <h3>{tr.issue}</h3>
                    <button
                      type="button"
                      className="reference-close"
                      onClick={() => setShowForm(false)}
                      aria-label={tr.close}
                    >
                      ×
                    </button>
                  </div>

                  <label>
                    {tr.title}
                    <input
                      required
                      maxLength={200}
                      value={form.title}
                      onChange={e => setForm({ ...form, title: e.target.value })}
                      placeholder={tr.titlePlaceholder}
                    />
                  </label>

                  <label>
                    {tr.category}
                    <select
                      value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })}
                    >
                      {categories.map(item => {
                        const categoryNames = {
                          en: {
                            Roads: 'Roads',
                            'Water Supply': 'Water Supply',
                            Electricity: 'Electricity',
                            Sanitation: 'Sanitation',
                            'Street Lights': 'Street Lights',
                            Drainage: 'Drainage',
                            Other: 'Other',
                          },
                          hi: {
                            Roads: 'सड़क',
                            'Water Supply': 'पानी की आपूर्ति',
                            Electricity: 'बिजली',
                            Sanitation: 'सफाई',
                            'Street Lights': 'स्ट्रीट लाइट',
                            Drainage: 'नाली',
                            Other: 'अन्य',
                          },
                          mr: {
                            Roads: 'रस्ते',
                            'Water Supply': 'पाणीपुरवठा',
                            Electricity: 'वीज',
                            Sanitation: 'स्वच्छता',
                            'Street Lights': 'पथदिवे',
                            Drainage: 'गटार',
                            Other: 'इतर',
                          },
                        }
                        return (
                          <option key={item.value} value={item.value}>
                            {(categoryNames[language] || categoryNames.en)[item.value]}
                          </option>
                        )
                      })}
                    </select>
                  </label>

                  <label>
                    {tr.description}
                    <textarea
                      required
                      rows={4}
                      value={form.description}
                      onChange={e => {
                        setForm({ ...form, description: e.target.value })
                        setVoiceOrigin(false)
                        setAiAnalysis(null)
                        setAiError('')
                      }}
                      placeholder={tr.descriptionPlaceholder}
                    />
                  </label>

                                    {showVoiceReviewDialog && (
                    <div
                      role="presentation"
                      onClick={(event) => {
                        if (event.target === event.currentTarget) {
                          setShowVoiceReviewDialog(false)
                        }
                      }}
                      style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        background: 'rgba(0, 0, 0, 0.55)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                      }}
                    >
                      <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="voice-review-dialog-title"
                        style={{
                          width: '100%',
                          maxWidth: '440px',
                          background: 'var(--panel, #ffffff)',
                          color: 'var(--text, #222222)',
                          borderRadius: '16px',
                          padding: '24px',
                          boxShadow: '0 16px 48px rgba(0,0,0,0.24)',
                        }}
                      >
                        <h2 id="voice-review-dialog-title">
                          Please review your complaint details
                        </h2>
                        <p>
                          Please check the details carefully and fill in the
                          location using the text fields or by selecting a
                          point on the map.
                        </p>
                        <button
                          type="button"
                          className="reference-primary"
                          onClick={() => setShowVoiceReviewDialog(false)}
                          style={{ width: '100%', marginTop: '12px' }}
                        >
                          OK
                        </button>
                      </section>
                    </div>
                  )}

                  <div className="reference-ai-review">
                    <button
                      className="reference-secondary"
                      type="button"
                      onClick={analyzeComplaintDraft}
                      disabled={aiLoading || submitting}
                    >
                      {aiLoading
                        ? ({
                            en: 'Understanding complaint…',
                            hi: 'शिकायत समझी जा रही है…',
                            mr: 'तक्रार समजून घेत आहोत…',
                          }[language] || 'Understanding complaint…')
                        : ({
                            en: '✨ Understand complaint with AI',
                            hi: '✨ AI से शिकायत समझें',
                            mr: '✨ AI द्वारे तक्रार समजून घ्या',
                          }[language] || '✨ Understand complaint with AI')}
                    </button>

                    {aiError && (
                      <p role="alert">{aiError}</p>
                    )}

                    {false && aiAnalysis && (
                      <section aria-live="polite">
                        <h4>AI understanding — please review</h4>
                        <p><strong>Summary:</strong> {aiAnalysis.issue_summary}</p>
                        <p><strong>Issue type:</strong> {aiAnalysis.issue_type}</p>
                        <p><strong>Duration:</strong> {aiAnalysis.duration}</p>
                        <p><strong>Urgency suggestion:</strong> {aiAnalysis.urgency}</p>
                        <p><strong>Reason:</strong> {aiAnalysis.urgency_reason}</p>

                        <p><strong>Location clues:</strong></p>
                        {aiAnalysis.location_clues?.length ? (
                          <ul>
                            {aiAnalysis.location_clues.map((clue, index) => (
                              <li key={`${clue}-${index}`}>{clue}</li>
                            ))}
                          </ul>
                        ) : <p>None identified.</p>}

                        <p><strong>Information that may be missing:</strong></p>
                        {aiAnalysis.missing_information?.length ? (
                          <ul>
                            {aiAnalysis.missing_information.map((item, index) => (
                              <li key={`${item}-${index}`}>{item}</li>
                            ))}
                          </ul>
                        ) : <p>No additional information suggested.</p>}

                        {aiAnalysis.needs_human_review && (
                          <p>Please review these suggestions and correct your complaint if needed.</p>
                        )}
                        <p className="reference-muted">
                          AI suggestions are not verified facts. Your complaint text remains editable.
                        </p>
                      </section>
                    )}
                  </div>

                  <div className="reference-photo-upload">
                    <label>
                      {({
                        en: 'Photo (optional, maximum 5 MB)',
                        hi: 'फोटो (वैकल्पिक, अधिकतम 5 MB)',
                        mr: 'फोटो (पर्यायी, कमाल 5 MB)',
                      }[language] || 'Photo (optional, maximum 5 MB)')}
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={event => {
                          const file = event.target.files?.[0] || null

                          if (file && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                            setPhotoFile(null)
                            event.target.value = ''
                            setError('Choose a JPEG, PNG, or WebP image.')
                            return
                          }

                          if (file && file.size > 5 * 1024 * 1024) {
                            setPhotoFile(null)
                            event.target.value = ''
                            setError('Photo must be 5 MB or smaller.')
                            return
                          }

                          setError('')
                          setPhotoFile(file)
                        }}
                      />
                    </label>

                    {photoPreview && (
                      <div className="reference-photo-preview">
                        <img src={photoPreview} alt="Selected complaint photo preview" />
                        <button
                          type="button"
                          className="reference-photo-remove"
                          aria-label="Remove selected photo"
                          onClick={() => {
                            setPhotoFile(null)
                            setError('')
                            if (photoInputRef.current) {
                              photoInputRef.current.value = ''
                            }
                          }}
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>

                  <IssueLocationPicker
                    location={complaintLocation}
                    onLocationChange={setComplaintLocation}
                    village={issueDetails.village}
                    ward={issueDetails.ward}
                    landmark={issueDetails.landmark}
                    onManualChange={(field, value) =>
                      setIssueDetails(current => ({
                        ...current,
                        [field]: value,
                      }))
                    }
                  />

<label>
                    {tr.complaintLanguage}
                    <select
                      value={form.original_language}
                      onChange={e => setForm({ ...form, original_language: e.target.value })}
                    >
                      <option value="en">{tr.english}</option>
                      <option value="hi">{tr.hindi}</option>
                      <option value="mr">{tr.marathi}</option>
                    </select>
                  </label>

                  <div className="reference-form-actions">
                    <button
                      className="reference-secondary"
                      type="button"
                      onClick={() => {
                        setShowForm(false)
                        setPhotoFile(null)
                        if (photoInputRef.current) photoInputRef.current.value = ''
                        setComplaintLocation(null)
                        setLocationMessage('')
                        setIssueDetails({
                          village: '',
                          ward: '',
                          landmark: '',
                        })
                      }}
                    >
                      {tr.cancel}
                    </button>
                    <button
                      className="reference-primary"
                      disabled={submitting}
                      type="submit"
                    >
                      {submitting ? tr.submitting : tr.submit}
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}

          {activeView === 'Voice Input' && (
            <section className="reference-panel reference-voice-screen">
              <span className="reference-section-kicker">{tr.voiceAssistant}</span>
              <h2>{tr.speakOwn}</h2>
              <p>{tr.voiceHelp}</p>

              <label>
                {tr.complaintLanguage}
                <select
                  value={form.original_language}
                  onChange={e => setForm({ ...form, original_language: e.target.value })}
                >
                  <option value="en">{tr.english}</option>
                  <option value="mr">{tr.marathi}</option>
                  <option value="hi">{tr.hindi}</option>
                </select>
              </label>

              <button
                className="reference-mic-button"
                type="button"
                onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
                disabled={false}
              >
                {isListening ? '■ Stop recording' : `🎙 ${tr.startSpeaking}`}
              </button>

              {isListening && (
                <p role="status" aria-live="polite">
                  🔴 Listening… Speak clearly, then select Stop recording.
                </p>
              )}

              <p className="reference-muted">{tr.reviewTranscript} {tr.voiceNote}</p>

              <button
                className="reference-secondary"
                type="button"
                onClick={() => navigate('Type a Complaint')}
              >
                {tr.textInstead}
              </button>
            </section>
          )}

          {activeView === 'Settings' && (
            <section className="reference-panel reference-settings">
              <span className="reference-section-kicker">{tr.account}</span>
              <h2>{tr.profile}</h2>

              <div className="reference-profile-details">
                <span className="reference-avatar reference-avatar-large">
                  {(user?.full_name || 'C').trim().charAt(0).toUpperCase()}
                </span>
                <div>
                  <h3>{user?.full_name || tr.citizen}</h3>
                  <p>{user?.email || tr.citizenAccount}</p>
                </div>
              </div>

              <label>
                {tr.preferredLanguage}
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                >
                  <option value="en">{tr.english}</option>
                  <option value="hi">{tr.hindi}</option>
                  <option value="mr">{tr.marathi}</option>
                </select>
              </label>

              <p className="reference-muted">{tr.languageHelp}</p>

              <button
                className="reference-secondary"
                type="button"
                onClick={onLogout}
              >
                {tr.logout}
              </button>
            </section>
          )}

          {activeView === 'Complaint Details' && selectedComplaint && (
            <section className="reference-panel">
              <button
                className="reference-back"
                type="button"
                onClick={() => navigate('My Complaints')}
              >
                {tr.backComplaints}
              </button>

              <span className="reference-section-kicker">
                {tr.complaintId} #{selectedComplaint.id}
              </span>

              <h2>{getComplaintDisplay(selectedComplaint, 'title')}</h2>

              <span className={`reference-status reference-status--${statusClass(selectedComplaint.status)}`}>
                {labelStatus(selectedComplaint.status, tr)}
              </span>

              <p>{getComplaintDisplay(selectedComplaint, 'description')}</p>

              <div className="reference-detail-grid">
                <span>{tr.categoryLabel}</span>
                <strong>{citizenCategoryLabel(selectedComplaint.category, language)}</strong>
                <span>{tr.submitted}</span>
                <strong>{formatDate(selectedComplaint.created_at, language, true)}</strong>
                <span>{tr.complaintId}</span>
                <strong>#{selectedComplaint.id}</strong>
              </div>

              <h3>{tr.progress}</h3>
              <p className="reference-muted">
                {tr.currentStatus}: {labelStatus(selectedComplaint.status, tr)}
              </p>

              <section className="reference-panel resolution-memory">
                <h3>Resolution history</h3>

                {caseHistoryLoading && (
                  <p className="reference-muted">
                    Loading resolution history…
                  </p>
                )}

                {caseHistoryError && (
                  <p role="alert" className="reference-muted">
                    {caseHistoryError}
                  </p>
                )}

                {!caseHistoryLoading && !caseHistoryError && caseHistory && (
                  <>
                    <p>
                      <strong>Assessment: </strong>
                      {caseHistory.resolution?.outcome || 'Awaiting assessment'}
                    </p>

                    <p>
                      {caseHistory.resolution?.recommendation ||
                        'No recommendation is available yet.'}
                    </p>

                    <p>
                      <strong>Follow-up required: </strong>
                      {caseHistory.resolution?.requires_follow_up ? 'Yes' : 'No'}
                    </p>

                    {caseHistory.recurrence?.is_recurring && (
                      <p className="resolution-memory-warning">
                        This issue may be recurring. Review the available
                        history before considering it resolved.
                      </p>
                    )}

                    <h4>Interventions</h4>

                    {canSubmitCitizenFeedback ? (
                      <ul>
                        {caseHistory.interventions.map((item, index) => (
                          <li key={item.id ?? `${item.created_at}-${index}`}>
                            <strong>{item.action_taken}</strong>
                            {item.created_at && (
                              <span>
                                {' '}— {formatDate(item.created_at, language)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="reference-muted">
                        No interventions have been recorded yet.
                      </p>
                    )}

                    <h4>Your feedback</h4>

                    {caseHistory.citizen_feedback?.length ? (
                      <ul>
                        {caseHistory.citizen_feedback.map((item, index) => (
                          <li key={item.id ?? `${item.created_at}-${index}`}>
                            {(item.outcome || 'unknown').replaceAll('_', ' ')}
                            {item.created_at && (
                              <span>
                                {' '}— {formatDate(item.created_at, language)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="reference-muted">
                        No feedback has been recorded yet.
                      </p>
                    )}

                    {canSubmitCitizenFeedback ? (
                    <div className="citizen-feedback-form">
                      <h4>Share feedback on this complaint</h4>
                      <p className="reference-muted">
                        Tell us whether the issue has been resolved. Your response
                        may affect the complaint's follow-up status.
                      </p>

                      <label htmlFor="citizen-feedback-outcome">
                        Resolution outcome
                      </label>
                      <select
                        id="citizen-feedback-outcome"
                        value={feedbackOutcome}
                        onChange={(event) => setFeedbackOutcome(event.target.value)}
                        disabled={feedbackSubmitting}
                      >
                        <option value="resolved">Resolved</option>
                        <option value="partially_solved">Partially solved</option>
                        <option value="not_solved">Not solved</option>
                      </select>

                      <label htmlFor="citizen-feedback-comments">
                        Comments (optional)
                      </label>
                      <textarea
                        id="citizen-feedback-comments"
                        value={feedbackComments}
                        onChange={(event) => setFeedbackComments(event.target.value)}
                        maxLength={5000}
                        rows={4}
                        placeholder="Describe your experience or any work that remains..."
                        disabled={feedbackSubmitting}
                      />

                      {feedbackNotice && (
                        <p role="status" className="reference-muted">
                          {feedbackNotice}
                        </p>
                      )}
                      {feedbackError && (
                        <p role="alert" className="reference-muted">
                          {feedbackError}
                        </p>
                      )}

                      <button
                        type="button"
                        className="reference-primary"
                        onClick={submitCitizenFeedback}
                        disabled={feedbackSubmitting || caseHistoryLoading}
                      >
                        {feedbackSubmitting ? 'Submitting feedback…' : 'Submit feedback'}
                      </button>
                    </div>
                    ) : (
                      <p className="reference-muted">
                        {caseHistory.citizen_feedback?.some((item) => item.outcome === 'resolved')
                          ? 'This complaint has been marked resolved. Feedback is closed.'
                          : 'You can submit feedback after a worker records new work on this complaint.'}
                      </p>
                    )}
                  </>
                )}
              </section>
            </section>
          )}

          {(activeView === 'Home' || activeView === 'My Complaints') && (
            <section className="reference-panel reference-my-complaints">
              <div className="reference-panel-heading">
                <div>
                  <span className="reference-section-kicker">{tr.keepTrack}</span>
                  <h2>
                    {activeView === 'Home' ? tr.myComplaints : tr.allComplaints}
                  </h2>
                  <p>{tr.follow}</p>
                </div>

                <button
                  className="reference-link-button"
                  type="button"
                  onClick={() => navigate(activeView === 'Home' ? 'My Complaints' : 'Home')}
                >
                  {activeView === 'Home' ? tr.viewAll : tr.backHome}
                </button>
              </div>

              <div className="reference-summary-row">
                <div>
                  <span>{tr.total}</span>
                  <strong>{loading ? '—' : complaints.length}</strong>
                </div>
                <div>
                  <span>{tr.inProgress}</span>
                  <strong>{loading ? '—' : openCount}</strong>
                </div>
                <div>
                  <span>{tr.resolved}</span>
                  <strong>{loading ? '—' : resolvedCount}</strong>
                </div>
              </div>

              {loading ? (
                <p className="reference-muted">{tr.loading}</p>
              ) : visibleComplaints.length === 0 ? (
                <div className="reference-empty">
                  <span>▤</span>
                  <h3>{tr.noComplaints}</h3>
                  <p>{tr.noComplaintsHelp}</p>
                  <button
                    className="reference-primary"
                    type="button"
                    onClick={() => navigate('Type a Complaint')}
                  >
                    {tr.firstComplaint}
                  </button>
                </div>
              ) : (
                <div className="reference-complaint-list">
                  {[...visibleComplaints].reverse().map(item => (
                    <button
                      type="button"
                      className="reference-complaint-row"
                      key={item.id}
                      onClick={() => {
                        setSelectedComplaint(item)
                        setActiveView('Complaint Details')
                      }}
                    >
                      <span className="reference-complaint-symbol">⌖</span>

                      <span className="reference-complaint-info">
                        <strong>{getComplaintDisplay(item, 'title')}</strong>
                        <small>
                          {citizenCategoryLabel(item.category, language)} · #{item.id} ·{' '}
                          {item.created_at
                            ? formatDate(item.created_at, language)
                            : tr.dateUnavailable}
                        </small>
                        <span>{getComplaintDisplay(item, 'description')}</span>
                      </span>

                      <span className={`reference-status reference-status--${statusClass(item.status)}`}>
                        {labelStatus(item.status, tr)}
                      </span>

                      <span className="reference-row-arrow">›</span>
                    </button>
                  ))}
                </div>
              )}

              <button
                className="reference-refresh"
                type="button"
                onClick={loadComplaints}
                disabled={loading}
              >
                {loading ? tr.refreshing : tr.refresh}
              </button>
            </section>
          )}
        </div>
      </section>

      <aside className="citizen-reference-right">
        <section className="reference-right-welcome">
          <span className="reference-section-kicker">{tr.community}</span>
          <h2>{tr.communityTitle}</h2>
          <img src="/images/village-landscape.png" alt="" />
          <p>{tr.communityHelp}</p>
        </section>

        <section className="reference-right-card">
          <div className="reference-right-heading">
            <span>◷</span>
            <h3>{tr.latest}</h3>
          </div>

          {complaints.slice(-3).reverse().length ? (
            complaints.slice(-3).reverse().map(item => (
              <button
                className="reference-update"
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedComplaint(item)
                  setActiveView('Complaint Details')
                }}
              >
                <span className="reference-update-dot" />
                <span>
                  <strong>{getComplaintDisplay(item, 'title')}</strong>
                  <small>{labelStatus(item.status, tr)} · #{item.id}</small>
                </span>
              </button>
            ))
          ) : (
            <p className="reference-muted">{tr.updatesHelp}</p>
          )}
        </section>

        <section className="reference-feedback-card">
          <span className="reference-feedback-icon">♡</span>
          <h3>{tr.feedback}</h3>
          <p>{tr.feedbackHelp}</p>
          <button type="button" onClick={() => navigate('My Complaints')}>
            {tr.review}
          </button>
        </section>

        <p className="reference-right-footer">
          GRAMSEVA<br />
          {tr.communityTitle}
        </p>
      </aside>
    </main>
  )
}
