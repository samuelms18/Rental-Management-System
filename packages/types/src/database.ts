
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "activity_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"after": Json | null,"before": Json | null,"created_at": string,"id": number,"property_id": string | null,"record_id": string | null,"table_name": string
                  }
                  Insert: {
                    "action": string,"actor_id"?: string | null,"after"?: Json | null,"before"?: Json | null,"created_at"?: string,"id"?: never,"property_id"?: string | null,"record_id"?: string | null,"table_name": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"after"?: Json | null,"before"?: Json | null,"created_at"?: string,"id"?: never,"property_id"?: string | null,"record_id"?: string | null,"table_name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_logs_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_logs_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties"
      referencedColumns: ["id"]
    }
                  ]
                },"charges": {
                  Row: {
                    "amount_paise": number,"cancel_reason": string | null,"created_at": string,"created_by": string | null,"due_date": string,"id": string,"notes": string | null,"period_end": string,"period_start": string,"source_id": string | null,"status": string,"tenancy_id": string,"type": string
                  }
                  Insert: {
                    "amount_paise": number,"cancel_reason"?: string | null,"created_at"?: string,"created_by"?: string | null,"due_date": string,"id"?: string,"notes"?: string | null,"period_end": string,"period_start": string,"source_id"?: string | null,"status"?: string,"tenancy_id": string,"type": string
                  }
                  Update: {
                    "amount_paise"?: number,"cancel_reason"?: string | null,"created_at"?: string,"created_by"?: string | null,"due_date"?: string,"id"?: string,"notes"?: string | null,"period_end"?: string,"period_start"?: string,"source_id"?: string | null,"status"?: string,"tenancy_id"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "charges_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "charges_tenancy_id_fkey"
      columns: ["tenancy_id"]
isOneToOne: false
      referencedRelation: "tenancies"
      referencedColumns: ["id"]
    }
                  ]
                },"complaint_media": {
                  Row: {
                    "complaint_id": string,"created_at": string,"id": string,"kind": string,"path": string,"uploaded_by": string | null
                  }
                  Insert: {
                    "complaint_id": string,"created_at"?: string,"id"?: string,"kind": string,"path": string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "complaint_id"?: string,"created_at"?: string,"id"?: string,"kind"?: string,"path"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "complaint_media_complaint_id_fkey"
      columns: ["complaint_id"]
isOneToOne: false
      referencedRelation: "complaints"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "complaint_media_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"complaint_updates": {
                  Row: {
                    "actor_id": string | null,"complaint_id": string,"created_at": string,"from_status": string | null,"id": number,"note": string | null,"to_status": string
                  }
                  Insert: {
                    "actor_id"?: string | null,"complaint_id": string,"created_at"?: string,"from_status"?: string | null,"id"?: never,"note"?: string | null,"to_status": string
                  }
                  Update: {
                    "actor_id"?: string | null,"complaint_id"?: string,"created_at"?: string,"from_status"?: string | null,"id"?: never,"note"?: string | null,"to_status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "complaint_updates_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "complaint_updates_complaint_id_fkey"
      columns: ["complaint_id"]
isOneToOne: false
      referencedRelation: "complaints"
      referencedColumns: ["id"]
    }
                  ]
                },"complaints": {
                  Row: {
                    "assigned_name": string | null,"assigned_phone": string | null,"category": string,"code": string,"created_at": string,"created_by": string | null,"description": string | null,"id": string,"priority": string,"reopened_count": number,"resolution_cost_paise": number | null,"resolution_note": string | null,"resolved_at": string | null,"status": string,"tenancy_id": string,"title": string
                  }
                  Insert: {
                    "assigned_name"?: string | null,"assigned_phone"?: string | null,"category": string,"code"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"priority"?: string,"reopened_count"?: number,"resolution_cost_paise"?: number | null,"resolution_note"?: string | null,"resolved_at"?: string | null,"status"?: string,"tenancy_id": string,"title": string
                  }
                  Update: {
                    "assigned_name"?: string | null,"assigned_phone"?: string | null,"category"?: string,"code"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"priority"?: string,"reopened_count"?: number,"resolution_cost_paise"?: number | null,"resolution_note"?: string | null,"resolved_at"?: string | null,"status"?: string,"tenancy_id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "complaints_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "complaints_tenancy_id_fkey"
      columns: ["tenancy_id"]
isOneToOne: false
      referencedRelation: "tenancies"
      referencedColumns: ["id"]
    }
                  ]
                },"consents": {
                  Row: {
                    "accepted_at": string,"id": string,"language": string,"notice_version": string,"purpose": string,"tenant_id": string
                  }
                  Insert: {
                    "accepted_at"?: string,"id"?: string,"language": string,"notice_version": string,"purpose": string,"tenant_id": string
                  }
                  Update: {
                    "accepted_at"?: string,"id"?: string,"language"?: string,"notice_version"?: string,"purpose"?: string,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "consents_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"eb_accounts": {
                  Row: {
                    "billing_cycle": string,"consumer_name": string | null,"created_at": string,"default_paid_by": string,"house_id": string,"id": string,"meter_number": string | null,"service_number": string
                  }
                  Insert: {
                    "billing_cycle"?: string,"consumer_name"?: string | null,"created_at"?: string,"default_paid_by"?: string,"house_id": string,"id"?: string,"meter_number"?: string | null,"service_number": string
                  }
                  Update: {
                    "billing_cycle"?: string,"consumer_name"?: string | null,"created_at"?: string,"default_paid_by"?: string,"house_id"?: string,"id"?: string,"meter_number"?: string | null,"service_number"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "eb_accounts_house_id_fkey"
      columns: ["house_id"]
isOneToOne: true
      referencedRelation: "houses"
      referencedColumns: ["id"]
    }
                  ]
                },"eb_bills": {
                  Row: {
                    "amount_paise": number,"bill_date": string | null,"created_at": string,"created_by": string | null,"due_date": string,"eb_account_id": string,"house_id": string,"id": string,"late_fee_paise": number,"owner_paid_on": string | null,"paid_by": string,"period_end": string,"period_start": string,"proof_path": string | null,"status": string,"tenancy_id": string | null,"total_paise": number | null,"units": number | null
                  }
                  Insert: {
                    "amount_paise": number,"bill_date"?: string | null,"created_at"?: string,"created_by"?: string | null,"due_date": string,"eb_account_id": string,"house_id": string,"id"?: string,"late_fee_paise"?: number,"owner_paid_on"?: string | null,"paid_by": string,"period_end": string,"period_start": string,"proof_path"?: string | null,"status"?: string,"tenancy_id"?: string | null,"total_paise"?: never,"units"?: number | null
                  }
                  Update: {
                    "amount_paise"?: number,"bill_date"?: string | null,"created_at"?: string,"created_by"?: string | null,"due_date"?: string,"eb_account_id"?: string,"house_id"?: string,"id"?: string,"late_fee_paise"?: number,"owner_paid_on"?: string | null,"paid_by"?: string,"period_end"?: string,"period_start"?: string,"proof_path"?: string | null,"status"?: string,"tenancy_id"?: string | null,"total_paise"?: never,"units"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "eb_bills_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "eb_bills_eb_account_id_fkey"
      columns: ["eb_account_id"]
isOneToOne: false
      referencedRelation: "eb_accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "eb_bills_house_id_fkey"
      columns: ["house_id"]
isOneToOne: false
      referencedRelation: "houses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "eb_bills_tenancy_id_fkey"
      columns: ["tenancy_id"]
isOneToOne: false
      referencedRelation: "tenancies"
      referencedColumns: ["id"]
    }
                  ]
                },"expenses": {
                  Row: {
                    "amount_paise": number,"category": string,"complaint_id": string | null,"created_at": string,"created_by": string | null,"description": string,"house_id": string | null,"id": string,"notes": string | null,"property_id": string,"receipt_path": string | null,"spent_on": string
                  }
                  Insert: {
                    "amount_paise": number,"category": string,"complaint_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"description": string,"house_id"?: string | null,"id"?: string,"notes"?: string | null,"property_id": string,"receipt_path"?: string | null,"spent_on": string
                  }
                  Update: {
                    "amount_paise"?: number,"category"?: string,"complaint_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"house_id"?: string | null,"id"?: string,"notes"?: string | null,"property_id"?: string,"receipt_path"?: string | null,"spent_on"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "expenses_complaint_id_fkey"
      columns: ["complaint_id"]
isOneToOne: false
      referencedRelation: "complaints"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_house_id_fkey"
      columns: ["house_id"]
isOneToOne: false
      referencedRelation: "houses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties"
      referencedColumns: ["id"]
    }
                  ]
                },"house_photos": {
                  Row: {
                    "area": string,"caption": string | null,"created_at": string,"house_id": string,"id": string,"sort_order": number,"storage_path": string,"uploaded_by": string | null
                  }
                  Insert: {
                    "area": string,"caption"?: string | null,"created_at"?: string,"house_id": string,"id"?: string,"sort_order"?: number,"storage_path": string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "area"?: string,"caption"?: string | null,"created_at"?: string,"house_id"?: string,"id"?: string,"sort_order"?: number,"storage_path"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "house_photos_house_id_fkey"
      columns: ["house_id"]
isOneToOne: false
      referencedRelation: "houses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "house_photos_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"houses": {
                  Row: {
                    "area_sqft": number | null,"bathrooms": number | null,"bedrooms": number | null,"created_at": string,"default_advance_paise": number,"default_rent_paise": number,"floor": string | null,"id": string,"notes": string | null,"property_id": string,"status": string,"unit_number": string,"unit_type": string | null,"water_billing_enabled": boolean
                  }
                  Insert: {
                    "area_sqft"?: number | null,"bathrooms"?: number | null,"bedrooms"?: number | null,"created_at"?: string,"default_advance_paise"?: number,"default_rent_paise"?: number,"floor"?: string | null,"id"?: string,"notes"?: string | null,"property_id": string,"status"?: string,"unit_number": string,"unit_type"?: string | null,"water_billing_enabled"?: boolean
                  }
                  Update: {
                    "area_sqft"?: number | null,"bathrooms"?: number | null,"bedrooms"?: number | null,"created_at"?: string,"default_advance_paise"?: number,"default_rent_paise"?: number,"floor"?: string | null,"id"?: string,"notes"?: string | null,"property_id"?: string,"status"?: string,"unit_number"?: string,"unit_type"?: string | null,"water_billing_enabled"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "houses_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties"
      referencedColumns: ["id"]
    }
                  ]
                },"identity_documents": {
                  Row: {
                    "back_path": string | null,"created_at": string,"doc_type": string,"expiry_date": string | null,"front_path": string | null,"id": string,"number_last4": string | null,"owner_id": string,"owner_type": string,"purge_after": string | null,"rejection_reason": string | null,"tenancy_id": string,"uploaded_by": string | null,"verification": string
                  }
                  Insert: {
                    "back_path"?: string | null,"created_at"?: string,"doc_type": string,"expiry_date"?: string | null,"front_path"?: string | null,"id"?: string,"number_last4"?: string | null,"owner_id": string,"owner_type": string,"purge_after"?: string | null,"rejection_reason"?: string | null,"tenancy_id": string,"uploaded_by"?: string | null,"verification"?: string
                  }
                  Update: {
                    "back_path"?: string | null,"created_at"?: string,"doc_type"?: string,"expiry_date"?: string | null,"front_path"?: string | null,"id"?: string,"number_last4"?: string | null,"owner_id"?: string,"owner_type"?: string,"purge_after"?: string | null,"rejection_reason"?: string | null,"tenancy_id"?: string,"uploaded_by"?: string | null,"verification"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "identity_documents_tenancy_id_fkey"
      columns: ["tenancy_id"]
isOneToOne: false
      referencedRelation: "tenancies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "identity_documents_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "created_at": string,"dedupe_key": string | null,"id": string,"kind": string,"link": string | null,"params": NonNullable<Json>,"read_at": string | null,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"dedupe_key"?: string | null,"id"?: string,"kind": string,"link"?: string | null,"params"?: NonNullable<Json>,"read_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"dedupe_key"?: string | null,"id"?: string,"kind"?: string,"link"?: string | null,"params"?: NonNullable<Json>,"read_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"occupants": {
                  Row: {
                    "age": number | null,"created_at": string,"end_date": string | null,"id": string,"name": string,"phone": string | null,"photo_path": string | null,"relationship": string | null,"start_date": string,"tenancy_id": string
                  }
                  Insert: {
                    "age"?: number | null,"created_at"?: string,"end_date"?: string | null,"id"?: string,"name": string,"phone"?: string | null,"photo_path"?: string | null,"relationship"?: string | null,"start_date"?: string,"tenancy_id": string
                  }
                  Update: {
                    "age"?: number | null,"created_at"?: string,"end_date"?: string | null,"id"?: string,"name"?: string,"phone"?: string | null,"photo_path"?: string | null,"relationship"?: string | null,"start_date"?: string,"tenancy_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "occupants_tenancy_id_fkey"
      columns: ["tenancy_id"]
isOneToOne: false
      referencedRelation: "tenancies"
      referencedColumns: ["id"]
    }
                  ]
                },"payee_settings": {
                  Row: {
                    "payee_name": string,"property_id": string,"qr_path": string | null,"updated_at": string,"updated_by": string | null,"upi_id": string
                  }
                  Insert: {
                    "payee_name": string,"property_id": string,"qr_path"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"upi_id": string
                  }
                  Update: {
                    "payee_name"?: string,"property_id"?: string,"qr_path"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"upi_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payee_settings_property_id_fkey"
      columns: ["property_id"]
isOneToOne: true
      referencedRelation: "properties"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payee_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_allocations": {
                  Row: {
                    "amount_paise": number,"charge_id": string,"created_at": string,"payment_id": string
                  }
                  Insert: {
                    "amount_paise": number,"charge_id": string,"created_at"?: string,"payment_id": string
                  }
                  Update: {
                    "amount_paise"?: number,"charge_id"?: string,"created_at"?: string,"payment_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_allocations_charge_id_fkey"
      columns: ["charge_id"]
isOneToOne: false
      referencedRelation: "charges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_allocations_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: false
      referencedRelation: "payments"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount_paise": number,"charge_id": string | null,"created_at": string,"id": string,"method": string,"notes": string | null,"paid_on": string,"paid_to": string,"proof_path": string | null,"received_by": string | null,"rejection_reason": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": string,"submitted_by": string | null,"tenancy_id": string,"utr_reference": string | null
                  }
                  Insert: {
                    "amount_paise": number,"charge_id"?: string | null,"created_at"?: string,"id"?: string,"method": string,"notes"?: string | null,"paid_on": string,"paid_to"?: string,"proof_path"?: string | null,"received_by"?: string | null,"rejection_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"submitted_by"?: string | null,"tenancy_id": string,"utr_reference"?: string | null
                  }
                  Update: {
                    "amount_paise"?: number,"charge_id"?: string | null,"created_at"?: string,"id"?: string,"method"?: string,"notes"?: string | null,"paid_on"?: string,"paid_to"?: string,"proof_path"?: string | null,"received_by"?: string | null,"rejection_reason"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"submitted_by"?: string | null,"tenancy_id"?: string,"utr_reference"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_charge_id_fkey"
      columns: ["charge_id"]
isOneToOne: false
      referencedRelation: "charges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_submitted_by_fkey"
      columns: ["submitted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_tenancy_id_fkey"
      columns: ["tenancy_id"]
isOneToOne: false
      referencedRelation: "tenancies"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "app_role": string,"created_at": string,"disabled_at": string | null,"email": string | null,"full_name": string,"id": string,"phone": string | null,"preferred_language": string
                  }
                  Insert: {
                    "app_role"?: string,"created_at"?: string,"disabled_at"?: string | null,"email"?: string | null,"full_name"?: string,"id": string,"phone"?: string | null,"preferred_language"?: string
                  }
                  Update: {
                    "app_role"?: string,"created_at"?: string,"disabled_at"?: string | null,"email"?: string | null,"full_name"?: string,"id"?: string,"phone"?: string | null,"preferred_language"?: string
                  }
                  Relationships: [
                    
                  ]
                },"properties": {
                  Row: {
                    "address_line": string,"city": string,"created_at": string,"description": string | null,"id": string,"name": string,"notes": string | null,"pin": string | null,"state": string
                  }
                  Insert: {
                    "address_line"?: string,"city"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"name": string,"notes"?: string | null,"pin"?: string | null,"state"?: string
                  }
                  Update: {
                    "address_line"?: string,"city"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"name"?: string,"notes"?: string | null,"pin"?: string | null,"state"?: string
                  }
                  Relationships: [
                    
                  ]
                },"property_members": {
                  Row: {
                    "created_at": string,"property_id": string,"role": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"property_id": string,"role": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"property_id"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "property_members_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "property_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"receipt_counters": {
                  Row: {
                    "last_no": number,"year": number
                  }
                  Insert: {
                    "last_no": number,"year": number
                  }
                  Update: {
                    "last_no"?: number,"year"?: number
                  }
                  Relationships: [
                    
                  ]
                },"receipts": {
                  Row: {
                    "cancel_reason": string | null,"cancelled_at": string | null,"id": string,"issued_at": string,"number": string,"payment_id": string,"pdf_path": string | null,"replaced_by": string | null
                  }
                  Insert: {
                    "cancel_reason"?: string | null,"cancelled_at"?: string | null,"id"?: string,"issued_at"?: string,"number": string,"payment_id": string,"pdf_path"?: string | null,"replaced_by"?: string | null
                  }
                  Update: {
                    "cancel_reason"?: string | null,"cancelled_at"?: string | null,"id"?: string,"issued_at"?: string,"number"?: string,"payment_id"?: string,"pdf_path"?: string | null,"replaced_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "receipts_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: false
      referencedRelation: "payments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "receipts_replaced_by_fkey"
      columns: ["replaced_by"]
isOneToOne: false
      referencedRelation: "receipts"
      referencedColumns: ["id"]
    }
                  ]
                },"reminder_rules": {
                  Row: {
                    "offsets": (number)[],"overdue_every_days": number,"property_id": string,"quiet_end": string,"quiet_start": string
                  }
                  Insert: {
                    "offsets"?: (number)[],"overdue_every_days"?: number,"property_id": string,"quiet_end"?: string,"quiet_start"?: string
                  }
                  Update: {
                    "offsets"?: (number)[],"overdue_every_days"?: number,"property_id"?: string,"quiet_end"?: string,"quiet_start"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reminder_rules_property_id_fkey"
      columns: ["property_id"]
isOneToOne: true
      referencedRelation: "properties"
      referencedColumns: ["id"]
    }
                  ]
                },"rent_revisions": {
                  Row: {
                    "amount_paise": number,"created_at": string,"effective_from": string,"id": string,"reason": string | null,"set_by": string | null,"tenancy_id": string
                  }
                  Insert: {
                    "amount_paise": number,"created_at"?: string,"effective_from": string,"id"?: string,"reason"?: string | null,"set_by"?: string | null,"tenancy_id": string
                  }
                  Update: {
                    "amount_paise"?: number,"created_at"?: string,"effective_from"?: string,"id"?: string,"reason"?: string | null,"set_by"?: string | null,"tenancy_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rent_revisions_set_by_fkey"
      columns: ["set_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "rent_revisions_tenancy_id_fkey"
      columns: ["tenancy_id"]
isOneToOne: false
      referencedRelation: "tenancies"
      referencedColumns: ["id"]
    }
                  ]
                },"scheduled_job_runs": {
                  Row: {
                    "details": Json | null,"finished_at": string | null,"id": number,"job": string,"ok": boolean | null,"started_at": string
                  }
                  Insert: {
                    "details"?: Json | null,"finished_at"?: string | null,"id"?: never,"job": string,"ok"?: boolean | null,"started_at"?: string
                  }
                  Update: {
                    "details"?: Json | null,"finished_at"?: string | null,"id"?: never,"job"?: string,"ok"?: boolean | null,"started_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"tenancies": {
                  Row: {
                    "activated_at": string | null,"actual_end_date": string | null,"advance_paise": number,"code": string,"created_at": string,"expected_end_date": string | null,"house_id": string,"id": string,"notice_period_days": number,"offline_agreement_path": string | null,"rent_due_day": number,"start_date": string,"status": string,"tenant_id": string
                  }
                  Insert: {
                    "activated_at"?: string | null,"actual_end_date"?: string | null,"advance_paise"?: number,"code"?: string,"created_at"?: string,"expected_end_date"?: string | null,"house_id": string,"id"?: string,"notice_period_days"?: number,"offline_agreement_path"?: string | null,"rent_due_day"?: number,"start_date": string,"status"?: string,"tenant_id": string
                  }
                  Update: {
                    "activated_at"?: string | null,"actual_end_date"?: string | null,"advance_paise"?: number,"code"?: string,"created_at"?: string,"expected_end_date"?: string | null,"house_id"?: string,"id"?: string,"notice_period_days"?: number,"offline_agreement_path"?: string | null,"rent_due_day"?: number,"start_date"?: string,"status"?: string,"tenant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenancies_house_id_fkey"
      columns: ["house_id"]
isOneToOne: false
      referencedRelation: "houses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tenancies_tenant_id_fkey"
      columns: ["tenant_id"]
isOneToOne: false
      referencedRelation: "tenants"
      referencedColumns: ["id"]
    }
                  ]
                },"tenants": {
                  Row: {
                    "created_at": string,"email": string,"emergency_contact_name": string | null,"emergency_contact_phone": string | null,"full_name": string,"id": string,"permanent_address": string | null,"phone": string,"photo_path": string | null,"status": string,"user_id": string | null
                  }
                  Insert: {
                    "created_at"?: string,"email": string,"emergency_contact_name"?: string | null,"emergency_contact_phone"?: string | null,"full_name": string,"id"?: string,"permanent_address"?: string | null,"phone": string,"photo_path"?: string | null,"status"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"emergency_contact_name"?: string | null,"emergency_contact_phone"?: string | null,"full_name"?: string,"id"?: string,"permanent_address"?: string | null,"phone"?: string,"photo_path"?: string | null,"status"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenants_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "approve_payment":
{ Args: { "p_allocations"?: Json,"p_payment_id": string }; Returns: string
                           },
"auto_close_complaints":
{ Args: { "p_now"?: string }; Returns: number
                           },
"cancel_receipt":
{ Args: { "p_reason": string,"p_receipt_id": string,"p_reissue"?: boolean }; Returns: string
                           },
"charge_paid_paise":
{ Args: { "p_charge_id": string }; Returns: number
                           },
"complaint_step":
{ Args: { "p_status": string }; Returns: number
                           },
"complaint_tenancy_id":
{ Args: { "p_complaint_id": string }; Returns: string
                           },
"confirm_complaint":
{ Args: { "p_complaint_id": string }; Returns: undefined
                           },
"generate_rent_charges":
{ Args: { "p_today"?: string }; Returns: number
                           },
"has_consent":
{ Args: { "p_tenant_id": string }; Returns: boolean
                           },
"house_property_id":
{ Args: { "p_house_id": string }; Returns: string
                           },
"is_aal2":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_any_owner":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_house_owner":
{ Args: { "p_house_id": string }; Returns: boolean
                           },
"is_house_staff":
{ Args: { "p_house_id": string }; Returns: boolean
                           },
"is_my_house":
{ Args: { "p_house_id": string }; Returns: boolean
                           },
"is_my_open_tenancy":
{ Args: { "p_tenancy_id": string }; Returns: boolean
                           },
"is_property_owner":
{ Args: { "p_property_id": string }; Returns: boolean
                           },
"is_property_staff":
{ Args: { "p_property_id": string }; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_tenancy_staff":
{ Args: { "p_tenancy_id": string }; Returns: boolean
                           },
"is_tenant_staff":
{ Args: { "p_tenant_id": string }; Returns: boolean
                           },
"issue_receipt":
{ Args: { "p_payment_id": string }; Returns: string
                           },
"log_action":
{ Args: { "p_action": string,"p_details"?: Json,"p_property_id"?: string,"p_record_id": string,"p_table": string }; Returns: undefined
                           },
"mark_overdue":
{ Args: { "p_today"?: string }; Returns: number
                           },
"my_tenant_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"notify":
{ Args: { "p_dedupe"?: string,"p_kind": string,"p_link": string,"p_params": Json,"p_user_id": string }; Returns: undefined
                           },
"notify_property_staff":
{ Args: { "p_dedupe_prefix"?: string,"p_kind": string,"p_link": string,"p_params": Json,"p_property_id": string }; Returns: undefined
                           },
"payment_tenancy_id":
{ Args: { "p_payment_id": string }; Returns: string
                           },
"property_id_for_row":
{ Args: { "p_row": Json,"p_table": string }; Returns: string
                           },
"prorate":
{ Args: { "p_from": string,"p_monthly": number,"p_to": string }; Returns: number
                           },
"queue_reminders":
{ Args: { "p_today"?: string }; Returns: number
                           },
"recompute_charge_status":
{ Args: { "p_charge_id": string }; Returns: undefined
                           },
"record_cash_payment":
{ Args: { "p_amount_paise": number,"p_charge_id"?: string,"p_notes"?: string,"p_paid_on": string,"p_received_by": string,"p_tenancy_id": string }; Returns: string
                           },
"record_owner_eb_payment":
{ Args: { "p_bill_id": string,"p_paid_on": string,"p_reimburse_due"?: string }; Returns: string
                           },
"reject_payment":
{ Args: { "p_payment_id": string,"p_reason": string }; Returns: undefined
                           },
"reminders_due":
{ Args: { "p_date"?: string }; Returns: {
              "amount_paise": number,"charge_id": string,"days_from_due": number,"due_date": string,"house_unit": string,"outstanding_paise": number,"property_id": string,"stage": string,"tenancy_code": string,"tenancy_id": string,"tenant_language": string,"tenant_name": string,"tenant_phone": string,"tenant_user_id": string,"type": string
            }[]
                           },
"rent_for":
{ Args: { "p_on": string,"p_tenancy_id": string }; Returns: number
                           },
"reopen_complaint":
{ Args: { "p_complaint_id": string,"p_reason": string }; Returns: undefined
                           },
"reverse_payment":
{ Args: { "p_payment_id": string,"p_reason": string }; Returns: undefined
                           },
"run_job":
{ Args: { "p_job": string }; Returns: undefined
                           },
"set_receipt_pdf":
{ Args: { "p_path": string,"p_receipt_id": string }; Returns: undefined
                           },
"staff_dashboard":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"staff_search":
{ Args: { "p_q": string }; Returns: {
              "id": string,"kind": string,"label": string,"link": string,"sublabel": string
            }[]
                           },
"tenancy_property_id":
{ Args: { "p_tenancy_id": string }; Returns: string
                           },
"tenancy_user_id":
{ Args: { "p_tenancy_id": string }; Returns: string
                           },
"today_ist":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"update_complaint":
{ Args: { "p_assigned_name"?: string,"p_assigned_phone"?: string,"p_complaint_id": string,"p_note"?: string,"p_resolution_cost_paise"?: number,"p_resolution_note"?: string,"p_status": string }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
