import { amountInWordsINR, formatDate, formatINR } from '@fpm/api';

export type AgreementData = {
  owner_name: string;
  owner_upi: string;
  tenant_name: string;
  property_address: string;
  house_unit: string;
  rent_paise: number;
  advance_paise: number;
  start_date: string;
  end_date: string;
  notice_days: number;
  due_day: number;
  occupants: string[];
  agreement_date: string;
};

/** Fill {{placeholders}} in a template. Unknown placeholders are left visible so they get noticed. */
export function fillAgreement(template: string, d: AgreementData): string {
  const values: Record<string, string> = {
    owner_name: d.owner_name,
    owner_upi: d.owner_upi || '—',
    tenant_name: d.tenant_name,
    property_address: d.property_address,
    house_unit: d.house_unit,
    rent: formatINR(d.rent_paise),
    rent_in_words: amountInWordsINR(d.rent_paise),
    advance: formatINR(d.advance_paise),
    advance_in_words: amountInWordsINR(d.advance_paise),
    start_date: formatDate(d.start_date),
    end_date: formatDate(d.end_date),
    notice_days: String(d.notice_days),
    due_day: ordinal(d.due_day),
    occupants: d.occupants.length ? d.occupants.join(', ') : 'None besides the Tenant',
    agreement_date: formatDate(d.agreement_date),
  };
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k: string) => values[k] ?? m);
}

/** 1 → "1st", 2 → "2nd", 5 → "5th", 22 → "22nd". */
export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

export const PLACEHOLDERS = [
  'owner_name', 'owner_upi', 'tenant_name', 'property_address', 'house_unit', 'rent', 'rent_in_words', 'advance',
  'advance_in_words', 'start_date', 'end_date', 'notice_days', 'due_day', 'occupants', 'agreement_date',
] as const;
