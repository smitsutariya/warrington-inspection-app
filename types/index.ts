export type UserRole = 'admin' | 'property_manager' | 'building_manager'
export type InspectionType = 'move_in' | 'move_out'
export type InspectionStatus = 'draft' | 'in_progress' | 'pending_tenant' | 'pending_pm' | 'complete'
export type ConditionCode = 'satisfactory' | 'cleaning' | 'damaged' | 'painting' | 'missing' | 'wear_tear' | 'stained'

export const CONDITION_CODE_LABELS: Record<ConditionCode, string> = {
  satisfactory: '✓ Satisfactory',
  cleaning: 'C – Cleaning',
  damaged: 'D – Damaged',
  painting: 'P – Painting',
  missing: 'M – Missing',
  wear_tear: 'W – Wear & Tear',
  stained: 'S – Stained',
}

export const CONDITION_CODE_SHORT: Record<ConditionCode, string> = {
  satisfactory: '✓',
  cleaning: 'C',
  damaged: 'D',
  painting: 'P',
  missing: 'M',
  wear_tear: 'W',
  stained: 'S',
}

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  name: string
  address: string
  city: string
  province: string
  postal_code?: string
  landlord_name: string
  landlord_address?: string
  created_at: string
  updated_at: string
}

export interface Unit {
  id: string
  property_id: string
  unit_number: string
  floor?: number
  bedrooms?: number
  created_at: string
  property?: Property
}

export interface InspectionSection {
  id: string
  name: string
  display_order: number
  icon: string
  items?: InspectionItem[]
}

export interface InspectionItem {
  id: string
  section_id: string
  name: string
  display_order: number
  response?: InspectionResponse
}

export interface InspectionResponse {
  id: string
  inspection_id: string
  item_id: string
  move_in_code?: ConditionCode
  move_in_comment?: string
  move_out_code?: ConditionCode
  move_out_comment?: string
  photos?: InspectionPhoto[]
}

export interface InspectionPhoto {
  id: string
  inspection_id: string
  response_id?: string
  storage_path: string
  url: string
  label?: string
  section_name?: string
  item_name?: string
  page_number?: number
  created_at: string
}

export interface DepositStatement {
  id: string
  inspection_id: string
  unpaid_rent: number
  liquidated_damages: number
  carpet_cleaning: number
  window_cover_cleaning: number
  suite_cleaning: number
  painting: number
  repair_replacement: number
  key_fob_replacement: number
  pet_damage: number
  other_charges: number
  security_deposit: number
  key_deposit: number
  accrued_interest: number
  other_deposit: number
  tenant_signature?: string
  tenant_signed_at?: string
}

export interface Inspection {
  id: string
  unit_id: string
  property_id: string
  type: InspectionType
  status: InspectionStatus
  tenant_name?: string
  tenant_email?: string
  tenant_agent_name?: string
  possession_date?: string
  end_of_tenancy_date?: string
  inspection_date?: string
  property_manager_name?: string
  resident_manager_name?: string
  created_by?: string
  move_in_inspection_id?: string
  forwarding_address?: string
  smoke_alarm_move_in?: string
  smoke_alarm_move_out?: string
  suite_keys_given: number
  suite_keys_returned: number
  building_keys_given: number
  building_keys_returned: number
  mailbox_keys_given: number
  mailbox_keys_returned: number
  fob1_code?: string
  fob2_code?: string
  fob3_code?: string
  parking_stall?: string
  parking_decal?: string
  locker_number?: string
  keys_missing_at_moveout: boolean
  tenant_signed_at?: string
  tenant_signature_data?: string
  tenant_agrees?: boolean
  tenant_disagreement_reason?: string
  landlord_signed_at?: string
  landlord_signature_data?: string
  pdf_url?: string
  pdf_generated_at?: string
  locked: boolean
  created_at: string
  updated_at: string
  unit?: Unit
  property?: Property
  deposit_statement?: DepositStatement
}

export interface AuditLog {
  id: string
  inspection_id: string
  user_id: string
  action: string
  details?: Record<string, unknown>
  created_at: string
  user?: Profile
}

// Form types
export interface InspectionFormData {
  property_id: string
  unit_id: string
  type: InspectionType
  inspection_date: string
  tenant_name: string
  tenant_email: string
  possession_date: string
  end_of_tenancy_date?: string
  property_manager_name: string
  resident_manager_name: string
}

export interface ResponseFormData {
  item_id: string
  move_in_code?: ConditionCode
  move_in_comment?: string
  move_out_code?: ConditionCode
  move_out_comment?: string
}
