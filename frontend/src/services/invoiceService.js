import api from './api.js';

export const submitInvoiceRequest = async (payload) => {
  const response = await api.post('/invoices', payload);
  return response.data;
};

export const listInvoicesRequest = async ({ archived = false } = {}) => {
  const response = await api.get('/invoices', {
    params: { archived },
  });
  return response.data;
};

export const getInvoiceRequest = async (invoiceId) => {
  const response = await api.get(`/invoices/${invoiceId}`);
  return response.data;
};

export const updateInvoiceRequest = async (invoiceId, payload) => {
  const response = await api.put(`/invoices/${invoiceId}`, payload);
  return response.data;
};

export const reviewInvoiceRequest = async (invoiceId, decision, note = '') => {
  const response = await api.patch(`/invoices/${invoiceId}/approval`, { decision, note });
  return response.data;
};

export const downloadInvoiceRequest = async (invoiceId) => {
  const response = await api.get(`/invoices/${invoiceId}/download`, {
    responseType: 'blob',
  });

  return {
    data: response.data,
    contentType: response.headers['content-type'],
    contentDisposition: response.headers['content-disposition'],
  };
};

export const viewInvoiceRequest = async (invoiceId) => {
  const response = await api.get(`/invoices/${invoiceId}/view`, {
    responseType: 'blob',
  });

  return {
    data: response.data,
    contentType: response.headers['content-type'],
    contentDisposition: response.headers['content-disposition'],
  };
};

export const deleteInvoiceRequest = async (invoiceId) => {
  const response = await api.delete(`/invoices/${invoiceId}`);
  return response.data;
};

export const archiveInvoiceRequest = async (invoiceId) => {
  const response = await api.patch(`/invoices/${invoiceId}/archive`);
  return response.data;
};
