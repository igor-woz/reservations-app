const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Pomocna funkcja do wykonania API call z obsługą błędów
export const apiCall = async (endpoint, options = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    }
  });

  // BEZPIECZEŃSTWO: Response zawsze musi być parsowany bezpiecznie
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API error');
  }

  return data;
};

// Endpoints autentykacji
export const authAPI = {
  register: (email, password, name) =>
    apiCall('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    }),

  login: (email, password) =>
    apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
};

// Endpoints usług
export const servicesAPI = {
  getAll: () => apiCall('/api/services', { method: 'GET' }),
  getById: (id) => apiCall(`/api/services/${id}`, { method: 'GET' })
};

// Endpoints rezerwacji
export const bookingsAPI = {
  getAll: () => apiCall('/api/bookings', { method: 'GET' }),
  create: (serviceId, date, time) =>
    apiCall('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ serviceId, date, time })
    }),
  cancel: (id) =>
    apiCall(`/api/bookings/${id}`, { method: 'DELETE' })
};