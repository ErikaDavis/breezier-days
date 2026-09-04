export const supportEmail = (import.meta.env.VITE_SUPPORT_EMAIL || '').trim();

export const supportMessage = supportEmail
  ? `Please contact ${supportEmail}.`
  : 'Breezier Days support is not configured yet.';

export const supportMailto = (subject: string, body = '') => {
  if (!supportEmail) return '';
  const params = new URLSearchParams({ subject, ...(body ? { body } : {}) });
  return `mailto:${supportEmail}?${params.toString()}`;
};
