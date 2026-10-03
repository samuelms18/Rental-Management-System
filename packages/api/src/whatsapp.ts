/** WhatsApp share links (free, no API): opens WhatsApp with a pre-filled message. Sent by a manager's tap. */
export function whatsappLink(phone10: string, text: string): string {
  const digits = phone10.replace(/\D/g, '');
  const intl = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

/** Fill "{name}" placeholders. */
export function fillTemplate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}
