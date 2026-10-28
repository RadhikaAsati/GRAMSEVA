const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

async function apiRequest(path, options = {}) {
  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
    })
  } catch {
    throw new Error(
      'Unable to connect to GRAMSEVA. Check that the backend is running.'
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const detail = data.detail
    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg).join(', ')
      : typeof detail === 'string'
        ? detail
        : 'Something went wrong. Please try again.'

    throw new Error(message)
  }

  return data
}

export function registerCitizen({
  full_name,
  email,
  phone,
  password,
}) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || null,
      password,
    }),
  })
}

export function loginUser({ email, password }) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  })
}

export function getCurrentUser(token) {
  return apiRequest('/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export function getSupportedLanguages() {
  return apiRequest('/languages')
}


export function getComplaints(token) {
  return apiRequest('/complaints/', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function createComplaint(token, complaint) {
  return apiRequest('/complaints/', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(complaint),
  })
}

export function translateComplaint(token, complaintId, target_language) {
  return apiRequest(`/complaints/${complaintId}/translate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ target_language }),
  })
}

export function getLanguagePreference(token) {
  return apiRequest('/preferences/language', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export function saveLanguagePreference(token, preferred_language) {
  return apiRequest('/preferences/language', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ preferred_language }),
  })
}

export function uploadComplaintPhoto(token, complaintId, file) {
  const body = new FormData()
  body.append('image', file)

  return apiRequest(`/complaints/${complaintId}/attachments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body,
  })
}

export function understandComplaintDraft(token, draft) {
  return apiRequest('/complaints/draft/understand', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(draft),
  })
}

export function getAdminDashboard(token) {
  return apiRequest('/dashboard/', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export function getAdminAnalytics(token) {
  return apiRequest('/dashboard/analytics', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function getAdminDecisions(token) {
  return apiRequest('/admin-decisions/', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function getComplaintDecisions(token, complaintId) {
  return apiRequest(`/admin-decisions/complaint/${complaintId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function createAdminDecision(token, decision) {
  return apiRequest('/admin-decisions/', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(decision),
  })
}

export function getAdminInterventions(token) {
  return apiRequest('/interventions/', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function createAdminIntervention(token, intervention) {
  return apiRequest('/interventions/', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(intervention),
  })
}

export function createWorkerIntervention(token, intervention) {
  return apiRequest('/interventions/', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(intervention),
  })
}

export function getAssets(token) {
  return apiRequest('/assets/', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function getAllComplaints(token) {
  return apiRequest('/complaints/', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function getComplaintDetails(token, complaintId) {
  return apiRequest(`/complaints/${complaintId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function getAdminWorkers(token) {
  return apiRequest('/admin-users/workers', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function createAdminWorker(token, worker) {
  return apiRequest('/admin-users/workers', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(worker),
  })
}

export function createCitizenFeedback(token, feedback) {
  return apiRequest('/feedback/', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(feedback),
  })
}

export function getComplaintCaseHistory(token, complaintId) {
  return apiRequest(`/complaints/${complaintId}/case-history`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function getSimilarCases(token, complaintId, limit = 5) {
  return apiRequest(
    `/complaints/${complaintId}/similar-cases?limit=${limit}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )
}

export function getComplaintResolution(token, complaintId) {
  return apiRequest(`/resolution/${complaintId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}
