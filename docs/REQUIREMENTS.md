# Family Property Manager — Requirements v1.2.1

Oct 3, 2026 · @Samuel

Family Property Manager is a secure, mobile-first system for one family to run 5 rental houses: tenants, rent, EB bills, agreements, documents, complaints and full property history in one place. Version 1.1 kept every requirement from v1.0 and added a review, compliance rules for India, data-model fixes and a staged release plan. v1.2 applied the owner decisions. v1.2.1 adds the implementation fixes listed in Section 21.

| Item | Value |
|---|---|
| Version | 1.2.1 (owner decisions applied 3 Oct 2026; implementation review fixes in Section 21) |
| Initial scale | 5 houses |
| Platforms | One web app, installable as a PWA on Android and iPhone; no app-store apps |
| Primary users | Owner (father), two managers (sons), tenants |
| Product principle | Owner dashboard answers "What needs my attention today?"; tenant experience is simple, private and limited to their own tenancy |

### What changed from v1.0
- Platform strategy: PWA-first, native apps in a later release (Section 3).
- Multiple owner users supported from day one (Section 4).
- Rent revision history added to tenancies (Section 6).
- Aadhaar and DPDP Act 2023 handling rules (Sections 7 and 16).
- Scheduled jobs defined for rent generation and reminders (Section 8).
- EB billing periods support bimonthly TNEB cycles (Section 9).
- Signature feature positioned as record-keeping, not legal registration (Section 11).
- WhatsApp reminders moved into V1 as share links (Section 13).
- A unified charges ledger replaces separate per-type billing logic (Section 17).
- Security built in from Phase 1, not Phase 10 (Section 19).
- Release split into V1 Core, V1.5 and V2 (Section 19).

### Owner decisions in v1.2
- Everything runs at zero cost: free tiers only, no paid SMS, no payment gateway, no app-store fees (Section 3).
- Rent is paid by scanning the father's UPI QR code shown in the app; the tenant then submits the UTR and screenshot (Section 8).
- Father is the Owner; Samuel and his brother manage day to day (Section 4).
- Guest ID is mandatory for every guest, even for one night (Section 7).
- Tenants may submit any accepted ID, not only Aadhaar, e.g. college student ID (Section 7).
- Each house has its own EB meter; bills are entered manually, and tenants can also check the TNEB website (Section 9).
- When the father pays an EB bill, the tenant reimburses him (Section 9).
- Rent receipts are generated automatically in V1 (Section 8).
- English, Tamil, Hindi and Malayalam from V1, and rent due on the 5th for all houses (Sections 3 and 8).
- The agreement template is reviewed in-family by Samuel's brother (law student) (Section 11).
- No AI features for now (Section 20).

## 1. Product overview

The application replaces manual rent reminders, payment tracking, EB reminders, document collection, complaint handling, agreement management, guest registration and move-out settlement with one centralized system.

**Core principle:** a house is permanent; a tenant is not. Every tenant gets a separate tenancy record, and old tenancies are closed, never overwritten or deleted.

```
PROPERTY
└── HOUSE
    ├── TENANCY #001 → Previous tenant (Completed)
    └── TENANCY #002 → Current tenant (Active)
```

## 2. Review summary

The v1.0 data model is sound; the main risk is building a 200-unit product for 5 houses. V1 should ship a smaller core, reach tenants on WhatsApp, and handle ID documents within Indian law.

**Strengths kept from v1.0**
- House-permanent, tenancy-per-tenant model makes history and deposit settlement natural.
- Rent counts as Paid only after owner approval of the tenant's submission.
- Repair costs are separate from deposit deductions.
- Billing model allows future charge types (water, maintenance).
- Security uses RLS, private storage and short-lived signed URLs.
- Monorepo shares types, validation and business rules.

**Key recommendations**

| # | Issue in v1.0 | Recommendation | Section |
|---|---|---|---|
| R1 | Web + Android + iOS for 5 tenants means two app store listings and two UI codebases | Ship one installable PWA; no app-store apps, so no developer fees | 3 |
| R2 | Push notifications need an installed app; tenants mostly read WhatsApp | Add WhatsApp share-link reminders to V1; keep in-app notification center | 13 |
| R3 | Full Aadhaar numbers stored; DPDP Act obligations not covered | Store masked numbers only; record consent; delete documents after a retention period | 7, 16 |
| R4 | Monthly rent is a single tenancy field | Add rent revision history with effective dates | 6 |
| R5 | Only one owner account implied | Owner-membership table so several family members can manage | 4 |
| R6 | EB assumed monthly | Billing period with start and end dates; TNEB bills every 2 months | 9 |
| R7 | "Automatically create" rent records with no mechanism | Scheduled daily job via Supabase cron / Edge Functions | 8 |
| R8 | Drawn signature presented like a legal e-sign | Position as tracking and storing the agreement; registered/stamped copy uploaded | 11 |
| R9 | Security listed as Phase 10 | RLS policies written and tested with each table from Phase 1 | 19 |
| R10 | MVP has 15 owner modules | V1 Core = 7 modules; the rest in V1.5 / V2 | 19 |

## 3. Platforms & technology

The whole product runs on free tiers at zero monthly cost: one responsive web app that tenants and managers install on their phones as a PWA. Every service below has a free plan large enough for 5 houses.

| Layer | Technology | Cost | Purpose |
|---|---|---|---|
| Web / PWA | Next.js + TypeScript | Free | Owner, manager and tenant app; "Add to home screen" on Android and iPhone |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions) | Free tier | APIs, scheduled jobs, business rules |
| Database | PostgreSQL with Row Level Security | Free tier (500 MB) | Core data and tenant isolation |
| Authentication | Supabase Auth: email + password or Google sign-in for everyone | Free | No SMS needed, so no OTP cost |
| Storage | Supabase Storage, private buckets | Free tier (1 GB) | Documents and photos, compressed on upload |
| Scheduled jobs | Supabase pg_cron + Edge Functions | Free | Rent generation, reminders |
| Rent payment | Father's UPI QR code image shown in app | Free | Tenant scans with any UPI app |
| Messaging | WhatsApp share links (pre-filled message, sent by a manager's tap) | Free | Reminders tenants actually read |
| Push | Web Push (V1.5) | Free | Device notifications for installed PWA |
| Email | Gmail SMTP with an app password, set as Supabase Auth custom SMTP | Free (~500/day) | Tenant invites, owner alerts, password reset |
| PDF | pdf-lib in a Next.js route (smaller than React-PDF; fits the Workers limit) | Free | Receipts, agreements |
| Languages | next-intl with translation files | Free | Multi-language screens and messages |
| Hosting | Cloudflare Workers via @opennextjs/cloudflare | Free | Web deployment |
| Backups | Weekly GitHub Action: pg_dump + Storage bucket copy | Free | Supabase free tier has no automatic backups |
| Keep-alive | GitHub Action pinging the Supabase API every 3 days | Free | Prevents the free project pausing |
| Source control | GitHub (private repo) | Free | Version control |
| Development | VS Code + Claude Code | — | AI-assisted development |

**Why no OTP:** SMS OTP costs money. Firebase gives 10 free SMS a day, but only on its pay-as-you-go plan with a card on file, and about USD 0.06 per SMS in India after that. Email + password or Google sign-in covers the same need at no cost. The manager creates each tenant account, so no public sign-up is needed.

**Why no app-store apps:** Google Play charges a one-time developer fee and Apple charges USD 99 a year. An installed PWA opens full-screen from the home screen and supports push notifications on both, at no cost (iPhone needs iOS 16.4+ and the app added to the home screen).

**Why Gmail SMTP:** Supabase's built-in mailer only delivers to project team members, so tenant invites need a custom SMTP server. Resend's free tier needs a verified custom domain (a paid purchase) to email other people. A Gmail app password is free.

**Languages:** every screen, notification and WhatsApp message template uses translation files. V1 ships English (default), Tamil, Hindi and Malayalam. More languages can be added later as files, with no code changes. A native speaker checks each translation before release. Each user picks a language in their profile.

**Hosting note:** Vercel Hobby's terms restrict commercial use; Cloudflare's free plan has no such restriction, so it is the safer default. The Workers free plan limits the server bundle to 3 MB; this is checked in Phase 1.

**Free-tier limits to watch:** Supabase free projects pause after 7 days with no activity. pg_cron runs inside the database and may not count as activity, so a GitHub Action pings the API every 3 days. Storage is 1 GB, which fits roughly 3,000 compressed photos and documents. If limits are reached later, Supabase Pro is the only paid upgrade needed.

## 4. User roles

There are three roles: Owner, Manager and Tenant. Owner and Manager are staff roles held per property in `property_members`; several family members can hold them for the same properties.

**Staff (Owner and Managers)**
- Manage properties, houses, tenants and tenancy records
- Manage rent, payment verification and EB bills
- Manage agreements and documents
- Manage complaints and maintenance
- Manage guests and domestic help
- Manage move-in, move-out and deposit settlement
- Send announcements and notifications
- View expenses, reports, history and audit logs

**Family roles:** the father is the **Owner**: his name appears on agreements and receipts, and his UPI QR receives rent. Samuel and his brother are **Managers**: they do all day-to-day work in the app (entering bills, approving payments, handling complaints, settlement). Only the Owner role can delete records or remove a manager. The father can use the app read-only or fully, as he prefers. Access is stored per property in `property_members` (role `owner` or `manager`), and every action records which of the three did it.

**Tenant**
- View only their own active tenancy
- View and submit rent and EB payment information
- View, sign and upload the rental agreement
- Upload permitted documents
- Manage occupants, guests and domestic help
- Raise and track complaints
- Receive announcements and notifications

**Privacy rule:** a tenant must never access another tenant's rent, documents, agreement, complaints, payments, guests or personal information. A former tenant loses access to the app when their tenancy is Completed, except a read-only view of their own settlement statement for 90 days.

## 5. Property & house management

A property holds one or more houses; each house has permanent details, permanent photos and an occupancy status.

**Property:** name, full address, city, state, PIN, photos, description and notes.

**House / unit:** unit number, floor, unit type, bedrooms, bathrooms, area (sq ft), default rent, default advance, EB configuration, water billing on/off (off in V1), occupancy status.

**House status:** Occupied, Vacant, Reserved, Under Maintenance. Status changes automatically when a tenancy is activated (Occupied) or settled (Vacant); owners can set Reserved and Under Maintenance manually.

**House photos:** exterior, living room, bedroom, kitchen, bathroom, balcony, parking, meter and other areas. These are permanent house photos, separate from per-tenancy move-in and move-out photos (Section 12), which are compared during deposit settlement.

**Image rules:** photos are compressed on upload (max 1600 px long edge, JPEG/WebP), with a 10 MB limit per original file.

## 6. Tenant & tenancy management

A tenant profile describes the person; a tenancy describes one stay in one house, with its own rent, deposit and agreement.

**Tenant profile:** full name, mobile number (contact and WhatsApp; not used for login), email (login identity), profile photo, permanent address, emergency contact, Active/Former status.

**Tenancy:** tenancy ID (e.g. `H01-T002`), house, primary tenant, start date, expected end date, actual end date, advance/deposit, notice period (days), rent due day of month, agreement, status.

**Tenancy statuses:** Draft → Pending Agreement → Active → Notice Period → Completed; Cancelled is allowed from Draft or Pending Agreement only. Until in-app agreements arrive (V1.5), staff can activate a tenancy with "Agreement signed offline" by uploading a scan of the paper agreement; this is how existing tenants are onboarded.

**Rent revisions (new in v1.1):** rent is stored in a `rent_revisions` table, not as a single field. Each revision has amount, effective-from date, reason and the owner who set it. Monthly rent records always use the revision in effect for that month, so history and reports stay correct after an increase.

**Critical rules**
- Never delete previous tenants or overwrite old tenancy records; close the old tenancy and create a new one.
- Only one Active or Notice Period tenancy per house at a time (enforced by a database constraint).
- A returning former tenant gets a new tenancy linked to their existing profile.

**Tenant onboarding:** a manager creates the tenant's account with their email (or Gmail for Google sign-in) and mobile number. The tenant receives a set-password link by email, then signs in and sees only their own tenancy. No public sign-up and no SMS OTP.

## 7. Occupants, documents, domestic help & guests

Tenants register everyone who lives in or regularly enters the house; identity documents are stored privately with masked numbers only.

**Occupants:** name, relationship, age, phone, ID (optional), photo, start date, end date. The dashboard shows total current occupants per house.

**Identity documents:** Aadhaar is not mandatory. Tenants, occupants and guests may submit any accepted ID: Aadhaar, PAN, Driving Licence, Passport, Voter ID, College/Student ID card, Employee ID card, Address Proof, Other. Each document stores type, masked number (where it has one), front and back images or PDF, verification status (Pending, Verified, Rejected), upload date and expiry date. Tenants can upload documents from the Draft status onward, since documents are collected during move-in.

**Aadhaar and personal-data rules (new in v1.1)**
- Store only the last 4 digits of Aadhaar (`XXXX-XXXX-1234`); never the full number in any column, log or export.
- Ask tenants to upload a masked Aadhaar copy (available from UIDAI); the upload screen explains why.
- Record the tenant's consent (date, purpose text, version) before any document upload, as required by the DPDP Act 2023.
- Delete identity documents of former tenants and their occupants after a set retention period (12 months after settlement), keeping only the audit entry.
- Full documents are visible only to the owner members and the uploading tenant, via signed URLs that expire in 5 minutes.

**Domestic help:** Maid, Cook, Driver, Caretaker, Other. Name, phone, address, ID (masked), photo, start/end dates, Active/Inactive.

**Guests:** name, phone, relationship, ID image (mandatory for every guest, even a one-night stay, for safety), check-in date, expected checkout, purpose, duration, status (Upcoming, Currently Staying, Checked Out). Managers are notified when a guest is registered. Guest ID images follow the same 12-month retention rule as tenant documents.

## 8. Rent management

A scheduled job creates one rent charge per active tenancy each month; a charge becomes Paid only when the owner approves enough payment against it.

**Rent record fields:** month, amount (from the rent revision in effect), due date, status, notes; linked payments carry payment date, method, UTR/reference, proof image and verification status.

**How tenants pay (no gateway, no fees):** the father's UPI QR code image and UPI ID are uploaded once by a manager and shown on the tenant's rent screen with the exact amount due. The tenant scans the QR with any UPI app (GPay, PhonePe, Paytm), pays, and then submits the UTR number and screenshot in the app. The app never processes money; it only records and verifies.

**Payment methods recorded:** UPI (QR scan), Cash to owner, Bank transfer, Other.

**Statuses:** Pending, Partially Paid, Paid, Overdue. Partial payments are supported by linking several payments to one charge. Payments allocated to a charge can never exceed the charge amount, and only approved payments count.

**Payment verification**
1. Tenant submits amount, date, method, UTR/reference and screenshot.
2. Owner is notified and approves or rejects with a reason.
3. Approved amounts are applied to the charge; the status updates automatically.
4. Rejected submissions stay visible to the tenant with the reason. The same UTR may be resubmitted after a rejection, but never twice while pending or approved.
5. Cash handed to the father is entered by a manager, recording who received it, and is approved on entry.

**Scheduled jobs (new in v1.1)** — pg_cron schedules are written in UTC.

| Job | Runs | Cron (UTC) | Action |
|---|---|---|---|
| Generate rent charges | Daily 01:00 IST | `30 19 * * *` | Create the next month's charge for each active tenancy, 7 days before due date; idempotent (never creates duplicates) |
| Mark overdue | Daily 01:05 IST | `35 19 * * *` | Set unpaid charges past due date to Overdue |
| Send reminders | Daily 09:00 IST | `30 3 * * *` | Queue in-app reminders per the tenancy's schedule and build the managers' "WhatsApp reminders to send today" list |

**Reminder schedule (configurable per property):** 5 days before, 2 days before, on the due date, and every 3 days while overdue. Dates are computed back from the actual due date.

**Due day: the 5th of every month, for all houses.** Rent is paid in advance for the current month (October rent is due 5 October). One due day keeps reminders, the dashboard and follow-up in a single batch, and the 5th falls just after most salary credits on the 1st. With the reminder rules above: 5 days before (31st or 30th), 2 days before (3rd), the 5th (due), then the 8th, 11th and so on while overdue.
- ~~A tenant moving in mid-month pays a pro-rated amount~~ **Changed 4 Oct 2026 (owner's decision):** the rent is fixed; a tenant moving in mid-month pays the full month's rent at move-in, then joins the regular cycle. Due day defaults to the 1st (set per tenancy).
- Each tenancy keeps a due-day field, so one house can be given a different day if a tenant's salary date needs it.

**First and last month:** ~~pro-rated by days~~ full month's rent (changed 4 Oct 2026), with the owner able to override the amount.

**Rent receipts (V1):** when a payment is approved, the app generates a PDF receipt with receipt number (e.g. `RCPT-2026-0001`), tenant, house, month, amount, method, UTR, date received and the owner's name. The tenant downloads it from the app or a manager shares it on WhatsApp. Receipts are numbered in sequence without gaps, restarting each year, and cannot be edited; a mistake is corrected by cancelling and reissuing.

## 9. EB bill management

EB bills are entered by the owner per billing period, which may be one or two months; late fees are tracked separately from the bill amount.

**EB account (per house):** every house has its own meter. Fields: service number, consumer name, meter number, billing cycle (bimonthly for TNEB), and who usually pays (Tenant directly, or Owner pays and tenant reimburses). The TNEB website login is shared with the tenant outside the app; the app never stores that password.

**EB bill:** period start and end date, units consumed (optional), bill amount, bill date, due date, late fee, total, payment date, payment proof, status (Pending, Paid, Overdue).

**Entering bills:** a manager enters each bill manually from the TNEB website or bill. Tenants can check the same bill on the TNEB website themselves.

**Who pays the bill**
- **Tenant pays TNEB directly:** tenant uploads the payment proof; a manager verifies it.
- **Father pays TNEB:** a manager records the father's payment, and the app creates a reimbursement charge for the tenant, paid by QR scan or cash to the father like rent.

**Mid-period move-out:** the final EB share is calculated in move-out settlement from a meter reading taken that day.

**Reminders:** upcoming, due-date and overdue, using the same mechanism as rent.

Water billing is out of V1, but EB, rent and future water and maintenance charges all use the same charges ledger (Section 17).

## 10. Complaints & maintenance

Tenants raise complaints with photos; owners move them through a fixed workflow, and repair costs go to expenses, never automatically to the deposit.

**Categories:** Plumbing, Electrical, Water, Bathroom, Kitchen, Leakage, Door/Lock, Appliance, Cleaning, Other.

**Complaint fields:** complaint ID, category, title, description, photos/video (video up to 50 MB, 60 seconds), priority (Low, Normal, Urgent), date, status, assigned person (name and phone, free text in V1), resolution note, resolution cost.

**Workflow:** Raised → Acknowledged → Assigned → In Progress → Resolved → Tenant Confirmed. If the tenant does not confirm within 7 days, the complaint closes automatically. The tenant can reopen a Resolved complaint once with a reason.

**Cost rule:** a resolution cost creates an expense record. It reaches the deposit only if the owner explicitly adds it as a deduction during move-out settlement, with a reason.

## 11. Rental agreement & signature

The app generates, tracks and stores the agreement; the legally binding copy is the stamped or registered agreement, which is uploaded into the app.

**Template:** the owner creates the agreement from a predefined template filled with owner, tenant, property, house, rent, advance, start and end dates, notice period and other terms. Each edit creates a new agreement version.

**Flow**
1. Create agreement (Draft)
2. Generate PDF (Generated)
3. Preview and send to tenant (Sent)
4. Tenant reviews and signs or uploads signed PDF (Awaiting Signature → Signed)
5. Owner reviews and approves (Approved)
6. Tenancy start date reached (Active)

**Other statuses:** Expired, Terminated.

**Legal note (new in v1.1):** a signature drawn in the app is a record of acceptance, not a formal e-signature under the IT Act. For enforceability, the parties should execute the agreement on stamp paper of the correct value, and register it where required. The app stores that executed copy as the final version. Aadhaar-based eSign through a licensed provider is in future scope.

**Template review:** Samuel's brother (law student) reviews the agreement template before Phase 6; no external lawyer is needed. He also confirms the current Tamil Nadu rules: whether the TN tenancy act (2017) requires registration of every agreement with the Rent Authority (not only those of 12 months or more), and any cap on the advance amount.

**Expiry reminders:** configurable, default 90, 60, 30 and 7 days before expiry, to owner and tenant. Renewal creates a new agreement linked to the same tenancy, with a rent revision if rent changes.

## 12. Move-in & move-out

Move-in is a guided checklist that ends in an Active tenancy; move-out ends in an itemized deposit settlement, a Completed tenancy and a Vacant house.

**Move-in checklist**
1. Select a vacant house
2. Create or select tenant
3. Create tenancy (rent, advance, dates, notice period)
4. Add occupants
5. Upload documents (with consent)
6. Generate agreement; tenant signs; owner approves
7. Record advance received
8. Capture move-in photos and meter reading
9. Activate tenancy

**Move-out record:** notice date, move-out date, final rent (pro-rated), final EB (from meter reading), other outstanding charges, move-out photos shown side by side with move-in photos, inspection findings, deductions, refund.

**Deposit settlement example**

| Item | Amount (₹) |
|---|---|
| Advance received | 80,000 |
| Painting | −2,000 |
| Tap damage | −500 |
| Cleaning | −500 |
| **Refund** | **77,000** |

Stored: original deposit, each deduction with reason and optional photo, outstanding rent and EB offset, final refund, refund date, refund method, transaction reference. The tenant sees the statement and can acknowledge it or raise a dispute note.

After settlement: tenancy becomes Completed and house becomes Vacant.

## 13. Notifications & announcements

Every notification lands in the in-app notification center; WhatsApp is the main way to reach tenants in V1, with push added later.

**Events:** rent upcoming, due and overdue; payment submitted, approved and rejected; EB reminders; agreement sent, signed, approved and expiring; complaint raised and status changes; announcements.

**Channels by release**

| Channel | Release | How it works | Cost |
|---|---|---|---|
| In-app notification center | V1 | Every event stored; read/unread; stays after push is dismissed | Free |
| WhatsApp share link | V1 | Manager taps "Send reminder"; WhatsApp opens with a pre-filled message in the tenant's language | Free |
| Email | V1 | Tenant invites, owner and manager alerts (payment submitted, complaint raised), password reset — via Gmail SMTP | Free |
| Web push | V1.5 | For users who installed the PWA, on Android and iPhone | Free |

Paid channels (SMS, WhatsApp Business API, native app push) are deliberately excluded.

**Announcements:** owner can target all tenants, one property, one house or one tenant. Each announcement records who read it.

**Quiet hours:** no automatic messages between 21:00 and 08:00 IST.

## 14. Dashboards

The owner dashboard is an action list ordered by urgency; the tenant dashboard shows only that tenant's house, dues and open items.

**Owner dashboard: "What needs my attention today?"**
1. Payment submissions waiting for approval
2. Overdue rent and EB, with days overdue
3. Urgent and unacknowledged complaints
4. Rent and EB due in the next 7 days
5. Agreements expiring within 90 days and tenants in notice period
6. Summary: houses total / occupied / vacant; rent expected / collected / pending this month

Each item links straight to the action (approve, remind, acknowledge).

**Tenant dashboard:** current house, rent amount and due date with the father's UPI QR code, a "Submit payment" button and receipt downloads, EB amount and due date, active complaint status, agreement status, unread announcements.

## 15. History, expenses, reports, search & audit

Every house keeps a lifetime timeline, every material change is logged, and reports are built from the same charges and payments data.

**Property history:** each house shows previous and current tenancies, rent revisions, move-ins, move-outs and major repairs. Current tenants never see earlier tenants' information.

```
House 01
2022 — Suresh moved in
2024 — Suresh moved out / deposit deduction
2024 — Ravi moved in
2025 — Rent changed
2026 — Ravi moved out
2026 — Arun moved in
```

**Expenses:** plumbing, electrical, painting, cleaning, appliance, repair, property tax, other. Fields: amount, date, property, house (optional), category, description, receipt, notes, linked complaint (optional).

**Reports:** monthly and yearly rent expected / collected / pending, EB, expenses, deposits held and refunded, net income per house. Export to CSV and PDF.

**Search:** tenant name, phone, house, property, tenancy ID, complaint, payment reference.

**Filters:** occupied/vacant houses; paid/pending/overdue rent and EB; open/in-progress/resolved complaints; current/former tenants.

**Audit log:** payment submissions and approvals, complaint updates, agreement signing and approval, guest registration, occupant updates, document views and downloads, rent revisions, deposit settlement. Each entry: actor, property, action, timestamp, record, before and after values. Audit entries cannot be edited or deleted, including by owners.

## 16. Security & compliance

Security is built with each feature from Phase 1, and no real tenant ID document or financial record is entered until the RLS test suite passes.

**Authentication & sessions**
- Email + password or Google sign-in for all users; accounts created only by managers
- TOTP two-factor (authenticator app): required for the Owner and Managers and enforced in the database (RLS) as well as the app; optional for tenants
- Password reset, secure HTTP-only cookies, session expiry and sign-out on all devices
- Rate limiting on login and upload endpoints

**Authorization & data isolation**
- Owner/Manager/Tenant role-based authorization, with staff access scoped through `property_members`
- Users can never change their own role; roles are set only by server code
- Row Level Security on every table; no table is created without its policies
- Automated RLS tests: a tenant account tries to read and write another tenancy's rows and files, and every attempt must fail
- Server-side input validation using shared schemas (Zod) for web and any future mobile app

**Files**
- Private storage buckets only; no public Aadhaar or agreement URLs
- Temporary signed URLs (5 minutes) after an authorization check
- File type and size validation (images, PDF, MP4; size limits per Sections 5 and 10)
- Image metadata (GPS location) stripped on upload

**Infrastructure**
- HTTPS in production; secrets in environment variables, never in frontend code or GitHub
- Service-role keys used only in Edge Functions and server code, never in the client
- Weekly backup via a free GitHub Action (pg_dump through the Supabase session pooler, plus a copy of all Storage buckets; encrypted; private repo or storage); a restore test before go-live and every 3 months
- Keep-alive GitHub Action every 3 days so the free project does not pause
- Dependency and security updates monthly (Dependabot)

**Payments:** never store UPI PINs, bank passwords, OTPs or card details. Payment records keep only amount, date, method and reference number.

**DPDP Act 2023 (new in v1.1)**
- A short privacy notice shown at tenant first sign-in, in the tenant's chosen language
- Recorded consent before personal documents are uploaded
- Tenant can request a copy of their data and correction of errors
- Retention: identity documents deleted 12 months after settlement; financial records kept 8 years for tax purposes
- A named owner member acts as the contact for data requests

## 17. Data model

v1.1 keeps the v1.0 entities and adds owner membership, rent revisions, a unified charges ledger, consents and billing periods.

| Area | Tables | Change from v1.0 |
|---|---|---|
| People & access | users (profiles), property_members, tenants, consents | property_members and consents are new |
| Properties | properties, houses, house_photos | — |
| Tenancy | tenancies, rent_revisions, occupants, tenant_documents (identity_documents), guests, domestic_help | rent_revisions is new |
| Money | charges, payments, payment_allocations, receipts, receipt_counters, payee_settings (father's UPI QR and UPI ID), eb_accounts, eb_bills, deposit_transactions, expenses | charges replaces rent_records as one ledger for rent, EB and future types; payment_allocations links one payment to one or more charges; receipt_counters gives gap-free yearly receipt numbers |
| Agreements | agreements, agreement_versions, signatures | — |
| Maintenance | complaints, complaint_updates, maintenance_items | — |
| Move in/out | move_in_records, move_out_records, meter_readings | meter_readings is new |
| Communication | announcements, announcement_reads, notifications, reminder_rules | announcement_reads and reminder_rules are new |
| System | activity_logs, scheduled_job_runs | scheduled_job_runs is new (records each job run for debugging) |

**Charges ledger:** each charge has a type (Rent, EB, EB reimbursement, Water, Maintenance, Other), tenancy, period, amount, due date and status. Rent and EB screens are filtered views of this one table, so water and maintenance in future need no new payment logic.

**Money values:** stored as integer paise, never floating point.

**Future tables:** water_accounts, water_bills, maintenance_staff, vendors.

## 18. Project structure

One monorepo shares types, validation, API definitions and business rules, keeping the option of a mobile app later.

```
family-property-manager/
├── apps/
│   └── web/            # Next.js PWA (owner, managers, tenants)
├── packages/
│   ├── types/          # Generated from Supabase schema
│   ├── validation/     # Zod schemas shared client + server
│   ├── api/            # Typed data-access functions
│   ├── i18n/           # Translation files: en, ta, hi, ml
│   ├── ui/             # Shared design tokens
│   └── config/
├── supabase/
│   ├── migrations/
│   ├── functions/      # Edge Functions: jobs, receipts, PDFs
│   ├── tests/          # RLS policy tests
│   └── seed/
├── .github/workflows/  # Tests, weekly backup, keep-alive
└── README.md
```

The monorepo layout keeps the option of a mobile app later without restructuring.

## 19. Release plan

V1 Core covers the work the owner does every month; everything else waits until V1 has been in real use. Security work runs inside every phase rather than as a final phase.

| Release | Phases | Scope | Gate to start next |
|---|---|---|---|
| V1 Core | 1–5 | Owners, houses, tenancies; QR rent, approval, receipts; EB, IDs, complaints; dashboards, WhatsApp links | RLS tests pass before real data |
| V1.5 | 6–8 | Agreements, PDF, signing; move-in/out, settlement; guests, domestic help; expenses, web push | V1 used for 2 months |
| V2 | 9–10 | Reports and exports; more languages; meter-reading history; all on free tiers | V1.5 stable |

Each release starts only after the previous gate is met; dates are set once Phase 1 is complete.

| Phase | Release | Scope | Done when |
|---|---|---|---|
| 1. Foundation | V1 | GitHub monorepo, Next.js PWA, Supabase, email/Google sign-in, Owner/Manager/Tenant roles, staff 2FA, RLS test harness, i18n with English, Tamil, Hindi and Malayalam, custom SMTP, weekly backup, keep-alive, deploy check | A tenant test account cannot read another tenancy |
| 2. Properties | V1 | Properties, houses, photos, occupancy status | All 5 houses entered |
| 3. Tenants | V1 | Tenants, tenancies, rent revisions, occupants, consent, ID documents (any accepted ID), offline-agreement activation | Current tenants onboarded with consent |
| 4. Finance | V1 | Charges ledger, father's UPI QR display, payment submission and approval, rent receipts, EB per house with reimbursement, scheduled jobs, reminders, WhatsApp links | One full rent cycle run through the app, receipts issued |
| 5. Complaints & dashboards | V1 | Complaint workflow, owner action dashboard, tenant home, audit log, restore test | Go-live gate passed |
| 6. Agreements | V1.5 | Templates (reviewed by brother), PDF generation, versions, signing, upload of stamped copy, expiry reminders | Next renewal handled in app |
| 7. Move in/out | V1.5 | Checklists, photos, meter readings, inspection, deposit settlement | First settlement completed in app |
| 8. People & costs | V1.5 | Guests with mandatory ID, domestic help, expenses, announcements, web push | — |
| 9. Reports | V2 | Financial and property reports, CSV/PDF export, meter-reading history | — |
| 10. More languages | V2 | Further languages, only if a tenant needs one; security hardening | — |

**MVP comparison:** v1.0 listed 15 owner modules for MVP. V1 Core now has 7 (dashboard, properties and houses, tenants and tenancies, rent, EB, documents, complaints) plus notifications and history as supporting features.

## 20. Future scope & open decisions

**Future scope (after V2)**
- Water bills and meter-reading history
- Maintenance staff accounts and vendor management
- Accounting integration and advanced financial reports
- A mobile app from the same monorepo, only if a free route exists

**Removed by owner decision:** online UPI payment and payment gateway (fees), WhatsApp Business API and SMS (paid per message), paid e-sign provider, AI assistant (not needed now).

**Open decisions for the owner family** — all closed:
- [x] Retention period for former tenants' ID documents: 12 months
- [x] Guest ID: mandatory for every guest, even one night
- [x] Overdue reminder frequency: every 3 days
- [x] EB meters: one per house, no shared meters
- [x] Roles: father is Owner; Samuel and brother are Managers
- [x] SMS provider: none; email or Google sign-in instead (free)
- [x] Agreement template review: Samuel's brother (law student)
- [x] Languages: English, Tamil, Hindi, Malayalam
- [x] Rent due day: 5th of every month for all houses
- [x] Father's UPI ID, QR image and payee name: uploaded by a manager during Phase 4 setup

**Still to confirm (not blocking Phase 1):**
- [ ] Brother to confirm Tamil Nadu tenancy act registration and advance-cap rules before Phase 6

## 21. Implementation review fixes (v1.2.1)

Applied after reviewing the Claude Code kit against v1.2. Each is reflected above and in `CLAUDE.md` / `docs/phases/`.

| # | Fix | Where |
|---|---|---|
| F1 | Email via Gmail SMTP as Supabase custom SMTP (Supabase's default mailer only emails team members; Resend free needs a paid domain) | 3, 13, Phase 1 |
| F2 | Backup also copies Storage buckets; pg_dump uses the session pooler (direct host is IPv6-only) | 3, 16, Phase 1 |
| F3 | pg_cron schedules written in UTC; separate keep-alive GitHub Action | 3, 8, Phase 1, Phase 4 |
| F4 | Three roles stated explicitly; users cannot change their own role | 4, 16, Phase 1 |
| F5 | Staff 2FA required and enforced in RLS (AAL2), not only middleware | 16, Phase 1 |
| F6 | Mobile number is contact only; email is the login identity | 6 |
| F7 | `activity_logs` carries `property_id` so staff-scoped policies work | 15, Phase 1 |
| F8 | "Agreement signed offline" activation for V1 / existing tenants | 6, Phase 3 |
| F9 | Tenants can upload documents from Draft (move-in) onward; masked Aadhaar image requested | 7, Phase 3 |
| F10 | UTR unique only among non-rejected payments; no over-allocation; only approved payments count; tenants cannot set review fields | 8, Phase 4 |
| F11 | First pro-rated rent charge created at activation; reminder dates computed from the due date | 8, Phase 4 |
| F12 | Gap-free receipt numbers restarting yearly (`receipt_counters`) | 8, 17, Phase 4 |
| F13 | Check the Cloudflare Workers 3 MB bundle limit in Phase 1. Result: 2.1 MB with pdf-lib, webpack build and minify | 3, Phase 1 |
| F14 | Hosting is Cloudflare Workers (OpenNext), not Pages | 3 |
| F15 | Tamil Nadu registration / advance-cap rules to be confirmed before Phase 6 | 11, 20, Phase 6 |
