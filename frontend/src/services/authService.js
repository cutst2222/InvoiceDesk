import api from './api.js';

export const registerRequest = async (payload) => {
  const response = await api.post('/auth/register', payload);
  return response.data;
};

export const loginRequest = async (payload) => {
  const response = await api.post('/auth/login', payload);
  return response.data;
};

export const meRequest = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const updateMyProfileRequest = async (payload) => {
  const response = await api.put('/auth/me', payload);
  return response.data;
};

export const logoutRequest = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

export const listUsersRequest = async () => {
  const response = await api.get('/auth/users');
  return response.data;
};

export const listPendingUsersRequest = async () => {
  const response = await api.get('/auth/users/pending');
  return response.data;
};

export const reviewConsultantRequest = async (userId, decision) => {
  const response = await api.patch(`/auth/users/${userId}/approval`, { decision });
  return response.data;
};

export const updateUserByAdminRequest = async (userId, payload) => {
  const response = await api.put(`/auth/users/${userId}`, payload);
  return response.data;
};
