import { describe, expect, it } from 'vitest';
import { documentSchema, ebBillSchema, parseForm, paymentSubmitSchema, tenancySchema, tenantSchema } from './index';

const id = '6f1c2b6e-8a3f-4c1e-9d2a-1b2c3d4e5f60';

describe('validation', () => {
  it('converts rupees to paise and normalises UTR', () => {
    const r = parseForm(paymentSubmitSchema, {
      tenancy_id: id, amount_paise: '12,500', paid_on: '2026-10-04', method: 'upi', utr_reference: ' 4123 5678 9012 ',
    });
    expect(r.ok && r.data.amount_paise).toBe(1250000);
    expect(r.ok && r.data.utr_reference).toBe('412356789012');
  });
  it('rejects cash from tenants', () => {
    const r = parseForm(paymentSubmitSchema, {
      tenancy_id: id, amount_paise: '100', paid_on: '2026-10-04', method: 'cash', utr_reference: 'ABCDEF',
    });
    expect(r.ok).toBe(false);
  });
  it('rejects full ID numbers', () => {
    const base = { tenancy_id: id, owner_type: 'tenant', owner_id: id, doc_type: 'aadhaar' };
    expect(parseForm(documentSchema, { ...base, number_last4: '123456789012' }).ok).toBe(false);
    expect(parseForm(documentSchema, { ...base, number_last4: '9012' }).ok).toBe(true);
  });
  it('normalises Indian phone numbers', () => {
    const r = parseForm(tenantSchema, { full_name: 'A', phone: '+91 98765 43210', email: 'A@X.COM' });
    expect(r.ok && r.data.phone).toBe('9876543210');
    expect(r.ok && r.data.email).toBe('a@x.com');
    expect(parseForm(tenantSchema, { full_name: 'A', phone: '12345', email: 'a@x.com' }).ok).toBe(false);
  });
  it('checks date order', () => {
    const r = parseForm(tenancySchema, {
      house_id: id, tenant_id: id, start_date: '2026-10-10', expected_end_date: '2026-10-01', rent_paise: '10000',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.expected_end_date).toBe('end_after_start');
    const eb = parseForm(ebBillSchema, {
      eb_account_id: id, period_start: '2026-09-01', period_end: '2026-10-31', amount_paise: '2400',
      due_date: '2026-11-15', paid_by: 'owner_reimbursed',
    });
    expect(eb.ok).toBe(true);
  });
});
