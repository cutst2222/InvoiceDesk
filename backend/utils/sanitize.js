const sanitizeValue = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  return value.replace(/[<>]/g, '').trim();
};

export const sanitizeInvoiceInput = (input) => {
  const sanitized = {};
  Object.entries(input).forEach(([key, value]) => {
    sanitized[key] = sanitizeValue(value);
  });

  return sanitized;
};
