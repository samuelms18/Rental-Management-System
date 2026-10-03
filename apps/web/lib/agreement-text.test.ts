import { describe, expect, it } from 'vitest';
import { fillAgreement } from './agreement-text';

describe('agreement template', () => {
  it('fills every placeholder', () => {
    const out = fillAgreement('{{owner_name}} lets {{house_unit}} to {{tenant_name}} for {{rent}} ({{rent_in_words}}) from {{ start_date }}. {{unknown}}', {
      owner_name: 'Appa', owner_upi: 'appa@okaxis', tenant_name: 'Meena', property_address: 'Chennai', house_unit: 'H03',
      rent_paise: 1000000, advance_paise: 5000000, start_date: '2026-10-05', end_date: '2027-09-04', notice_days: 30,
      due_day: 5, occupants: [], agreement_date: '2026-10-03',
    });
    expect(out).toBe('Appa lets H03 to Meena for ₹10,000 (Rupees Ten Thousand Only) from 5 Oct 2026. {{unknown}}');
  });
});
