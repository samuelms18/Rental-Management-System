
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
                },"agreement_templates": {
                  Row: {
                    "body_markdown": string,"created_at": string,"id": string,"is_active": boolean,"language": string,"name": string,"reviewed_by_note": string | null,"updated_by": string | null,"version": number
                  }
                  Insert: {
                    "body_markdown": string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"language"?: string,"name": string,"reviewed_by_note"?: string | null,"updated_by"?: string | null,"version"?: number
                  }
                  Update: {
                    "body_markdown"?: string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"language"?: string,"name"?: string,"reviewed_by_note"?: string | null,"updated_by"?: string | null,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "agreement_templates_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"agreement_versions": {
                  Row: {
                    "agreement_id": string,"body_text": string,"created_at": string,"created_by": string | null,"data_snapshot": NonNullable<Json>,"id": string,"rendered_pdf_path": string | null,"version_no": number
                  }
                  Insert: {
                    "agreement_id": string,"body_text": string,"created_at"?: string,"created_by"?: string | null,"data_snapshot"?: NonNullable<Json>,"id"?: string,"rendered_pdf_path"?: string | null,"version_no": number
                  }
                  Update: {
                    "agreement_id"?: string,"body_text"?: string,"created_at"?: string,"created_by"?: string | null,"data_snapshot"?: NonNullable<Json>,"id"?: string,"rendered_pdf_path"?: string | null,"version_no"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "agreement_versions_agreement_id_fkey"
      columns: ["agreement_id"]
isOneToOne: false
      referencedRelation: "agreements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreement_versions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"agreements": {
                  Row: {
                    "advance_paise": number,"approved_at": string | null,"approved_by": string | null,"created_at": string,"created_by": string | null,"current_version_id": string | null,"end_date": string,"final_stamped_path": string | null,"id": string,"renewal_of": string | null,"rent_paise": number,"sent_at": string | null,"signed_at": string | null,"start_date": string,"status": string,"template_id": string | null,"tenancy_id": string,"terminated_reason": string | null
                  }
                  Insert: {
                    "advance_paise"?: number,"approved_at"?: string | null,"approved_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"current_version_id"?: string | null,"end_date": string,"final_stamped_path"?: string | null,"id"?: string,"renewal_of"?: string | null,"rent_paise": number,"sent_at"?: string | null,"signed_at"?: string | null,"start_date": string,"status"?: string,"template_id"?: string | null,"tenancy_id": string,"terminated_reason"?: string | null
                  }
                  Update: {
                    "advance_paise"?: number,"approved_at"?: string | null,"approved_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"current_version_id"?: string | null,"end_date"?: string,"final_stamped_path"?: string | null,"id"?: string,"renewal_of"?: string | null,"rent_paise"?: number,"sent_at"?: string | null,"signed_at"?: string | null,"start_date"?: string,"status"?: string,"template_id"?: string | null,"tenancy_id"?: string,"terminated_reason"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "agreements_approved_by_fkey"
      columns: ["approved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreements_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreements_current_version_fk"
      columns: ["current_version_id"]
isOneToOne: false
      referencedRelation: "agreement_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreements_renewal_of_fkey"
      columns: ["renewal_of"]
isOneToOne: false
      referencedRelation: "agreements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreements_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "agreement_templates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreements_tenancy_id_fkey"
      columns: ["tenancy_id"]
isOneToOne: false
      referencedRelation: "tenancies"
      referencedColumns: ["id"]
    }
                  ]
                },"announcement_reads": {
                  Row: {
                    "announcement_id": string,"read_at": string,"user_id": string
                  }
                  Insert: {
                    "announcement_id": string,"read_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "announcement_id"?: string,"read_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "announcement_reads_announcement_id_fkey"
      columns: ["announcement_id"]
isOneToOne: false
      referencedRelation: "announcements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "announcement_reads_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"announcements": {
                  Row: {
                    "author_id": string | null,"body": string,"created_at": string,"id": string,"property_id": string | null,"target": string,"target_id": string | null,"title": string,"translations": NonNullable<Json>
                  }
                  Insert: {
                    "author_id"?: string | null,"body": string,"created_at"?: string,"id"?: string,"property_id"?: string | null,"target": string,"target_id"?: string | null,"title": string,"translations"?: NonNullable<Json>
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string,"created_at"?: string,"id"?: string,"property_id"?: string | null,"target"?: string,"target_id"?: string | null,"title"?: string,"translations"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "announcements_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "announcements_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties"
      referencedColumns: ["id"]
    }
                  ]
                },"app_settings": {
                  Row: {
                    "key": string,"value": string
                  }
                  Insert: {
                    "key": string,"value": string
                  }
                  Update: {
                    "key"?: string,"value"?: string
                  }
                  Relationships: [
                    
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
                },"deposit_transactions": {
                  Row: {
                    "amount_paise": number,"charge_id": string | null,"created_at": string,"created_by": string | null,"id": string,"photo_path": string | null,"reason": string | null,"tenancy_id": string,"type": string
                  }
                  Insert: {
                    "amount_paise": number,"charge_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"photo_path"?: string | null,"reason"?: string | null,"tenancy_id": string,"type": string
                  }
                  Update: {
                    "amount_paise"?: number,"charge_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"photo_path"?: string | null,"reason"?: string | null,"tenancy_id"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "deposit_transactions_charge_id_fkey"
      columns: ["charge_id"]
isOneToOne: false
      referencedRelation: "charges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deposit_transactions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deposit_transactions_tenancy_id_fkey"
      columns: ["tenancy_id"]
isOneToOne: false
      referencedRelation: "tenancies"
      referencedColumns: ["id"]
    }
                  ]
                },"domestic_help": {
                  Row: {
                    "active": boolean,"address": string | null,"created_at": string,"end_date": string | null,"id": string,"name": string,"phone": string | null,"photo_path": string | null,"role": string,"start_date": string,"tenancy_id": string
                  }
                  Insert: {
                    "active"?: boolean,"address"?: string | null,"created_at"?: string,"end_date"?: string | null,"id"?: string,"name": string,"phone"?: string | null,"photo_path"?: string | null,"role": string,"start_date"?: string,"tenancy_id": string
                  }
                  Update: {
                    "active"?: boolean,"address"?: string | null,"created_at"?: string,"end_date"?: string | null,"id"?: string,"name"?: string,"phone"?: string | null,"photo_path"?: string | null,"role"?: string,"start_date"?: string,"tenancy_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "domestic_help_tenancy_id_fkey"
      columns: ["tenancy_id"]
isOneToOne: false
      referencedRelation: "tenancies"
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
                },"guests": {
                  Row: {
                    "check_in": string,"checked_out_at": string | null,"created_at": string,"created_by": string | null,"expected_checkout": string | null,"id": string,"name": string,"phone": string | null,"purpose": string | null,"relationship": string | null,"status": string,"tenancy_id": string
                  }
                  Insert: {
                    "check_in": string,"checked_out_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"expected_checkout"?: string | null,"id"?: string,"name": string,"phone"?: string | null,"purpose"?: string | null,"relationship"?: string | null,"status"?: string,"tenancy_id": string
                  }
                  Update: {
                    "check_in"?: string,"checked_out_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"expected_checkout"?: string | null,"id"?: string,"name"?: string,"phone"?: string | null,"purpose"?: string | null,"relationship"?: string | null,"status"?: string,"tenancy_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "guests_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "guests_tenancy_id_fkey"
      columns: ["tenancy_id"]
isOneToOne: false
      referencedRelation: "tenancies"
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
                },"meter_readings": {
                  Row: {
                    "created_at": string,"created_by": string | null,"house_id": string,"id": string,"photo_path": string | null,"read_on": string,"reading": number,"stage": string,"tenancy_id": string | null
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"house_id": string,"id"?: string,"photo_path"?: string | null,"read_on"?: string,"reading": number,"stage"?: string,"tenancy_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"house_id"?: string,"id"?: string,"photo_path"?: string | null,"read_on"?: string,"reading"?: number,"stage"?: string,"tenancy_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "meter_readings_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meter_readings_house_id_fkey"
      columns: ["house_id"]
isOneToOne: false
      referencedRelation: "houses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meter_readings_tenancy_id_fkey"
      columns: ["tenancy_id"]
isOneToOne: false
      referencedRelation: "tenancies"
      referencedColumns: ["id"]
    }
                  ]
                },"move_in_records": {
                  Row: {
                    "advance_method": string | null,"advance_received_on": string | null,"advance_received_paise": number | null,"advance_reference": string | null,"checklist": NonNullable<Json>,"completed_at": string | null,"completed_by": string | null,"created_at": string,"id": string,"meter_reading_id": string | null,"tenancy_id": string
                  }
                  Insert: {
                    "advance_method"?: string | null,"advance_received_on"?: string | null,"advance_received_paise"?: number | null,"advance_reference"?: string | null,"checklist"?: NonNullable<Json>,"completed_at"?: string | null,"completed_by"?: string | null,"created_at"?: string,"id"?: string,"meter_reading_id"?: string | null,"tenancy_id": string
                  }
                  Update: {
                    "advance_method"?: string | null,"advance_received_on"?: string | null,"advance_received_paise"?: number | null,"advance_reference"?: string | null,"checklist"?: NonNullable<Json>,"completed_at"?: string | null,"completed_by"?: string | null,"created_at"?: string,"id"?: string,"meter_reading_id"?: string | null,"tenancy_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "move_in_records_completed_by_fkey"
      columns: ["completed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "move_in_records_meter_reading_id_fkey"
      columns: ["meter_reading_id"]
isOneToOne: false
      referencedRelation: "meter_readings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "move_in_records_tenancy_id_fkey"
      columns: ["tenancy_id"]
isOneToOne: true
      referencedRelation: "tenancies"
      referencedColumns: ["id"]
    }
                  ]
                },"move_out_records": {
                  Row: {
                    "created_at": string,"eb_rate_paise": number | null,"eb_units": number | null,"final_eb_paise": number,"id": string,"inspection_notes": string | null,"meter_reading_id": string | null,"move_out_date": string,"notice_date": string | null,"refund_date": string | null,"refund_method": string | null,"refund_paise": number | null,"refund_reference": string | null,"settled_at": string | null,"settled_by": string | null,"shared_at": string | null,"statement_path": string | null,"status": string,"tenancy_id": string,"tenant_note": string | null
                  }
                  Insert: {
                    "created_at"?: string,"eb_rate_paise"?: number | null,"eb_units"?: number | null,"final_eb_paise"?: number,"id"?: string,"inspection_notes"?: string | null,"meter_reading_id"?: string | null,"move_out_date": string,"notice_date"?: string | null,"refund_date"?: string | null,"refund_method"?: string | null,"refund_paise"?: number | null,"refund_reference"?: string | null,"settled_at"?: string | null,"settled_by"?: string | null,"shared_at"?: string | null,"statement_path"?: string | null,"status"?: string,"tenancy_id": string,"tenant_note"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"eb_rate_paise"?: number | null,"eb_units"?: number | null,"final_eb_paise"?: number,"id"?: string,"inspection_notes"?: string | null,"meter_reading_id"?: string | null,"move_out_date"?: string,"notice_date"?: string | null,"refund_date"?: string | null,"refund_method"?: string | null,"refund_paise"?: number | null,"refund_reference"?: string | null,"settled_at"?: string | null,"settled_by"?: string | null,"shared_at"?: string | null,"statement_path"?: string | null,"status"?: string,"tenancy_id"?: string,"tenant_note"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "move_out_records_meter_reading_id_fkey"
      columns: ["meter_reading_id"]
isOneToOne: false
      referencedRelation: "meter_readings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "move_out_records_settled_by_fkey"
      columns: ["settled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "move_out_records_tenancy_id_fkey"
      columns: ["tenancy_id"]
isOneToOne: true
      referencedRelation: "tenancies"
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
                },"push_subscriptions": {
                  Row: {
                    "created_at": string,"endpoint": string,"id": string,"keys": NonNullable<Json>,"user_agent": string | null,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"endpoint": string,"id"?: string,"keys": NonNullable<Json>,"user_agent"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"endpoint"?: string,"id"?: string,"keys"?: NonNullable<Json>,"user_agent"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_subscriptions_user_id_fkey"
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
                },"signatures": {
                  Row: {
                    "agreement_version_id": string,"id": string,"image_path": string,"ip": string | null,"method": string,"signed_at": string,"signer_id": string | null,"signer_role": string,"user_agent": string | null
                  }
                  Insert: {
                    "agreement_version_id": string,"id"?: string,"image_path": string,"ip"?: string | null,"method": string,"signed_at"?: string,"signer_id"?: string | null,"signer_role": string,"user_agent"?: string | null
                  }
                  Update: {
                    "agreement_version_id"?: string,"id"?: string,"image_path"?: string,"ip"?: string | null,"method"?: string,"signed_at"?: string,"signer_id"?: string | null,"signer_role"?: string,"user_agent"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "signatures_agreement_version_id_fkey"
      columns: ["agreement_version_id"]
isOneToOne: false
      referencedRelation: "agreement_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "signatures_signer_id_fkey"
      columns: ["signer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
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
                },"tenancy_photos": {
                  Row: {
                    "area": string,"caption": string | null,"created_at": string,"created_by": string | null,"id": string,"path": string,"stage": string,"tenancy_id": string
                  }
                  Insert: {
                    "area": string,"caption"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"path": string,"stage": string,"tenancy_id": string
                  }
                  Update: {
                    "area"?: string,"caption"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"path"?: string,"stage"?: string,"tenancy_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tenancy_photos_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tenancy_photos_tenancy_id_fkey"
      columns: ["tenancy_id"]
isOneToOne: false
      referencedRelation: "tenancies"
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
            "activate_agreement":
{ Args: { "p_id": string }; Returns: undefined
                           },
"agreement_tenancy_id":
{ Args: { "p_agreement_id": string }; Returns: string
                           },
"agreement_visible_to_tenant":
{ Args: { "p_agreement_id": string }; Returns: boolean
                           },
"agreements_daily":
{ Args: { "p_today"?: string }; Returns: number
                           },
"announcement_property":
{ Args: { "p_id": string }; Returns: string
                           },
"announcement_targets_me":
{ Args: { "p_target": string,"p_target_id": string }; Returns: boolean
                           },
"announcement_visible":
{ Args: { "p_id": string }; Returns: boolean
                           },
"approve_agreement":
{ Args: { "p_id": string }; Returns: undefined
                           },
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
"complete_move_in":
{ Args: { "p_tenancy_id": string }; Returns: undefined
                           },
"confirm_complaint":
{ Args: { "p_complaint_id": string }; Returns: undefined
                           },
"deposit_summary":
{ Args: { "p_tenancy_id": string }; Returns: {
              "balance": number,"deductions": number,"offset_eb": number,"offset_rent": number,"received": number,"refunded": number
            }[]
                           },
"disable_former_tenants":
{ Args: { "p_now"?: string }; Returns: number
                           },
"documents_due_for_purge":
{ Args: { "p_today"?: string }; Returns: {
              "back_path": string,"front_path": string,"id": string
            }[]
                           },
"generate_rent_charges":
{ Args: { "p_today"?: string }; Returns: number
                           },
"guest_checkout":
{ Args: { "p_guest_id": string }; Returns: undefined
                           },
"guests_daily":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"has_consent":
{ Args: { "p_tenant_id": string }; Returns: boolean
                           },
"house_property_id":
{ Args: { "p_house_id": string }; Returns: string
                           },
"house_timeline":
{ Args: { "p_house_id": string,"p_major_repair_paise"?: number }; Returns: {
              "amount_paise": number,"kind": string,"label": string,"on_date": string,"ref_id": string
            }[]
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
"is_my_settlement":
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
"mark_agreement_generated":
{ Args: { "p_id": string }; Returns: undefined
                           },
"mark_overdue":
{ Args: { "p_today"?: string }; Returns: number
                           },
"meter_history":
{ Args: { "p_house_id": string }; Returns: {
              "id": string,"read_on": string,"reading": number,"stage": string,"units": number
            }[]
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
"purge_documents":
{ Args: { "p_ids": (string)[] }; Returns: number
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
"register_guest":
{ Args: { "p_back_path"?: string,"p_check_in": string,"p_doc_type": string,"p_expected_checkout": string,"p_front_path": string,"p_name": string,"p_number_last4": string,"p_phone": string,"p_purpose": string,"p_relationship": string,"p_tenancy_id": string }; Returns: string
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
"reopen_settlement":
{ Args: { "p_tenancy_id": string }; Returns: undefined
                           },
"report_deposits":
{ Args: { "p_house_id"?: string,"p_property_id"?: string }; Returns: {
              "code": string,"deductions_paise": number,"held_paise": number,"offsets_paise": number,"received_paise": number,"refunded_paise": number,"status": string,"tenancy_id": string,"tenant_name": string,"unit_number": string
            }[]
                           },
"report_eb":
{ Args: { "p_from": string,"p_house_id"?: string,"p_property_id"?: string,"p_to": string }; Returns: {
              "billed_paise": number,"house_id": string,"outstanding_paise": number,"paid_by_owner_paise": number,"paid_by_tenant_paise": number,"reimbursed_paise": number,"unit_number": string
            }[]
                           },
"report_expenses":
{ Args: { "p_from": string,"p_house_id"?: string,"p_property_id"?: string,"p_to": string }; Returns: {
              "category": string,"house_id": string,"items": number,"total_paise": number,"unit_number": string
            }[]
                           },
"report_net_income":
{ Args: { "p_from": string,"p_house_id"?: string,"p_property_id"?: string,"p_to": string }; Returns: {
              "expenses_paise": number,"house_id": string,"net_paise": number,"rent_collected_paise": number,"unit_number": string
            }[]
                           },
"report_rent":
{ Args: { "p_from": string,"p_house_id"?: string,"p_property_id"?: string,"p_to": string }; Returns: {
              "collected_paise": number,"expected_paise": number,"house_id": string,"month": string,"overdue_paise": number,"pending_paise": number,"property_name": string,"unit_number": string
            }[]
                           },
"respond_settlement":
{ Args: { "p_accept": boolean,"p_note"?: string,"p_tenancy_id": string }; Returns: undefined
                           },
"reverse_payment":
{ Args: { "p_payment_id": string,"p_reason": string }; Returns: undefined
                           },
"run_job":
{ Args: { "p_job": string }; Returns: undefined
                           },
"send_agreement":
{ Args: { "p_id": string }; Returns: undefined
                           },
"set_agreement_status":
{ Args: { "p_id": string,"p_status": string }; Returns: undefined
                           },
"set_receipt_pdf":
{ Args: { "p_path": string,"p_receipt_id": string }; Returns: undefined
                           },
"settle_move_out":
{ Args: { "p_method": string,"p_reference"?: string,"p_refund_date": string,"p_tenancy_id": string }; Returns: undefined
                           },
"share_settlement":
{ Args: { "p_tenancy_id": string }; Returns: undefined
                           },
"sign_agreement":
{ Args: { "p_id": string,"p_image_path": string,"p_ip"?: string,"p_method": string,"p_user_agent"?: string }; Returns: undefined
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
"terminate_agreement":
{ Args: { "p_id": string,"p_reason": string }; Returns: undefined
                           },
"today_ist":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"update_complaint":
{ Args: { "p_assigned_name"?: string,"p_assigned_phone"?: string,"p_complaint_id": string,"p_note"?: string,"p_resolution_cost_paise"?: number,"p_resolution_note"?: string,"p_status": string }; Returns: undefined
                           },
"usage_summary":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"version_agreement_id":
{ Args: { "p_version_id": string }; Returns: string
                           },
"view_agreement":
{ Args: { "p_id": string }; Returns: undefined
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
