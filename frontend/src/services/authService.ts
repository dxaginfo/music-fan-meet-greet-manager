import api from './api';

const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

const register = async (email: string, password: string, firstName: string, lastName: string, role: string) => {
  const response = await api.post('/auth/register', {
    email,
    password,
    firstName,
    lastName,
    role,
  });
  return response.data;
};

const logout = () => {
  // No API call needed for logout in JWT auth
  // Just remove the token from localStorage
  localStorage.removeItem('token');
};

const authService = {
  login,
  register,
  logout,
};

export default authService;
