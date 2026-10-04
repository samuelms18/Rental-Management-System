import { z } from 'zod';
import {
  checkbox,
  idLast4,
  isoDate,
  locale,
  optionalDate,
  optionalInt,
  optionalPhone,
  optionalText,
  optionalUuid,
  phone,
  pin,
  positiveRupees,
  rupees,
  text,
  uuid,
} from './fields';

// ---------- Phase 1 ----------
export const profileSchema = z.object({
  full_name: text(120),
  phone: optionalPhone,
  preferred_language: locale,
});

// ---------- Phase 2 ----------
export const propertySchema = z.object({
  name: text(120),
  address_line: optionalText(300),
  city: optionalText(80),
  state: optionalText(80),
  pin,
  description: optionalText(2000),
  notes: optionalText(2000),
});

export const HOUSE_STATUSES = ['occupied', 'vacant', 'reserved', 'under_maintenance'] as const;
export const MANUAL_HOUSE_STATUSES = ['vacant', 'reserved', 'under_maintenance'] as const;

export const houseSchema = z.object({
  property_id: uuid,
  unit_number: text(20),
  floor: optionalText(20),
  unit_type: optionalText(40),
  bedrooms: optionalInt(0, 20),
  bathrooms: optionalInt(0, 20),
  area_sqft: optionalInt(1, 100000),
  default_rent_paise: rupees.default(0),
  default_advance_paise: rupees.default(0),
  notes: optionalText(2000),
});

export const PHOTO_AREAS = [
  'exterior', 'living', 'bedroom', 'kitchen', 'bathroom', 'balcony', 'parking', 'meter', 'other',
] as const;
export const housePhotoSchema = z.object({
  house_id: uuid,
  area: z.enum(PHOTO_AREAS),
  caption: optionalText(200),
});

// ---------- Phase 3 ----------
export const tenantSchema = z.object({
  full_name: text(120),
  phone,
  email: z.email('invalid_email').transform((e) => e.toLowerCase()),
  permanent_address: optionalText(500),
  emergency_contact_name: optionalText(120),
  emergency_contact_phone: optionalPhone,
  preferred_language: locale.default('en'),
});

export const tenancySchema = z
  .object({
    house_id: uuid,
    tenant_id: uuid,
    start_date: isoDate,
    expected_end_date: optionalDate,
    rent_paise: positiveRupees,
    advance_paise: rupees.default(0),
    notice_period_days: z.coerce.number().int().min(0).max(365).default(30),
    rent_due_day: z.coerce.number().int().min(1).max(28).default(1),
  })
  .refine((v) => !v.expected_end_date || v.expected_end_date > v.start_date, {
    path: ['expected_end_date'],
    message: 'end_after_start',
  });

export const rentRevisionSchema = z.object({
  tenancy_id: uuid,
  amount_paise: positiveRupees,
  effective_from: isoDate,
  reason: optionalText(300),
});

export const noticeSchema = z.object({
  tenancy_id: uuid,
  actual_end_date: isoDate,
});

export const occupantSchema = z.object({
  tenancy_id: uuid,
  name: text(120),
  relationship: optionalText(60),
  age: optionalInt(0, 120),
  phone: optionalPhone,
  start_date: optionalDate,
});

export const DOC_TYPES = [
  'aadhaar', 'pan', 'driving_licence', 'passport', 'voter_id', 'student_id', 'employee_id', 'address_proof', 'other',
] as const;
export const documentSchema = z.object({
  tenancy_id: uuid,
  owner_type: z.enum(['tenant', 'occupant']),
  owner_id: uuid,
  doc_type: z.enum(DOC_TYPES),
  number_last4: idLast4,
  expiry_date: optionalDate,
});

export const verifyDocumentSchema = z
  .object({
    id: uuid,
    verification: z.enum(['verified', 'rejected']),
    rejection_reason: optionalText(300),
  })
  .refine((v) => v.verification !== 'rejected' || !!v.rejection_reason, {
    path: ['rejection_reason'],
    message: 'reason_required',
  });

export const consentSchema = z.object({
  accept: checkbox.refine((v) => v, 'consent_required'),
});

// ---------- Phase 4 ----------
export const payeeSchema = z.object({
  property_id: uuid,
  payee_name: text(120),
  upi_id: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9._-]{2,255}@[A-Za-z0-9.-]{2,64}$/, 'invalid_upi'),
});

export const paymentSubmitSchema = z.object({
  tenancy_id: uuid,
  charge_id: optionalUuid,
  amount_paise: positiveRupees,
  paid_on: isoDate,
  method: z.enum(['upi', 'bank_transfer', 'other']),
  paid_to: z.enum(['owner', 'tneb']).default('owner'),
  utr_reference: z
    .string()
    .trim()
    .transform((s) => s.replace(/\s/g, '').toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9-]{6,40}$/, 'invalid_utr')),
  notes: optionalText(500),
});

export const cashPaymentSchema = z.object({
  tenancy_id: uuid,
  charge_id: optionalUuid,
  amount_paise: positiveRupees,
  paid_on: isoDate,
  received_by: text(80),
  notes: optionalText(500),
});

export const rejectSchema = z.object({ id: uuid, reason: text(300) });

export const chargeEditSchema = z.object({
  id: uuid,
  amount_paise: positiveRupees,
  due_date: isoDate,
  notes: optionalText(300),
});
export const chargeCancelSchema = z.object({ id: uuid, reason: text(300) });

export const ebAccountSchema = z.object({
  house_id: uuid,
  service_number: text(40),
  consumer_name: optionalText(120),
  meter_number: optionalText(40),
  billing_cycle: z.enum(['bimonthly', 'monthly']).default('bimonthly'),
  default_paid_by: z.enum(['tenant_direct', 'owner_reimbursed']),
});

export const ebBillSchema = z
  .object({
    eb_account_id: uuid,
    period_start: isoDate,
    period_end: isoDate,
    units: optionalInt(0, 1_000_000),
    amount_paise: rupees,
    late_fee_paise: rupees.default(0),
    bill_date: optionalDate,
    due_date: isoDate,
    paid_by: z.enum(['tenant_direct', 'owner_reimbursed']),
  })
  .refine((v) => v.period_end >= v.period_start, { path: ['period_end'], message: 'end_after_start' });

export const ownerEbPaymentSchema = z.object({
  bill_id: uuid,
  paid_on: isoDate,
  reimburse_due: optionalDate,
});

// ---------- Phase 5 ----------
export const COMPLAINT_CATEGORIES = [
  'plumbing', 'electrical', 'water', 'bathroom', 'kitchen', 'leakage', 'door_lock', 'appliance', 'cleaning', 'other',
] as const;
export const COMPLAINT_STATUSES = [
  'raised', 'acknowledged', 'assigned', 'in_progress', 'resolved', 'tenant_confirmed', 'closed',
] as const;

export const complaintSchema = z.object({
  tenancy_id: uuid,
  category: z.enum(COMPLAINT_CATEGORIES),
  title: text(140),
  description: optionalText(2000),
  priority: z.enum(['low', 'normal', 'urgent']).default('normal'),
});

export const complaintUpdateSchema = z.object({
  id: uuid,
  status: z.enum(['acknowledged', 'assigned', 'in_progress', 'resolved']),
  note: optionalText(500),
  assigned_name: optionalText(120),
  assigned_phone: optionalPhone,
  resolution_note: optionalText(1000),
  resolution_cost_paise: z.preprocess((v) => (v === '' ? undefined : v), rupees.optional()),
});

export const reopenSchema = z.object({ id: uuid, reason: text(300) });

export const EXPENSE_CATEGORIES = [
  'plumbing', 'electrical', 'painting', 'cleaning', 'appliance', 'repair', 'property_tax', 'other',
] as const;
export const expenseSchema = z.object({
  property_id: uuid,
  house_id: optionalUuid,
  category: z.enum(EXPENSE_CATEGORIES),
  amount_paise: positiveRupees,
  spent_on: isoDate,
  description: text(300),
  notes: optionalText(1000),
});

// ---------- Team (owners only) ----------
export const teamRole = z.enum(['owner', 'manager']);
export const memberRoleSchema = z.object({ user_id: uuid, role: teamRole });
export const memberRemoveSchema = z.object({ user_id: uuid });
export const memberInviteSchema = z.object({
  full_name: text(120),
  email: z.email('invalid_email').transform((e) => e.toLowerCase()),
  role: teamRole,
});
export const loginAccessSchema = z.object({ user_id: uuid, enabled: z.enum(['true', 'false']) });
