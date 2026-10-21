export type UserRole = 'ADMIN' | 'QUOTATION_STAFF';

export interface User {
  id: number;
  name: string;
  username: string;
  mobile?: string;
  role: UserRole;
  active: number;
  created_at?: string;
}

export interface Client {
  id: number;
  client_code: string;
  name: string;
  mobile: string;
  alternate_mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  notes?: string;
  archived: number;
  created_at: string;
  events_count?: number;
  quotations_count?: number;
}

export interface EventType {
  id: number;
  name: string;
  description?: string;
  active: number;
  sort_order: number;
}

export interface StudioEvent {
  id: number;
  client_id: number;
  event_type_id?: number;
  event_name: string;
  event_date: string;
  end_date?: string;
  venue?: string;
  city?: string;
  requirements?: string;
  special_instructions?: string;
  notes?: string;
  status: 'Enquiry' | 'Quotation Sent' | 'Confirmed' | 'Completed' | 'Cancelled';
  created_at?: string;
  client_name?: string;
  client_mobile?: string;
  client_code?: string;
  event_type_name?: string;
}

export interface ServiceCategory {
  id: number;
  name: string;
  description?: string;
  active: number;
  sort_order: number;
  services?: Service[];
}

export interface Service {
  id: number;
  category_id: number;
  name: string;
  description?: string;
  unit: string;
  price: number;
  active: number;
  sort_order: number;
}

export type QuotationStatus = 
  | 'Draft' 
  | 'Sent' 
  | 'Accepted' 
  | 'Rejected' 
  | 'Converted to Booking' 
  | 'Cancelled';

export interface QuotationItem {
  id?: number;
  quotation_id?: number;
  quotation_event_id?: number;
  service_id?: number;
  service_name_snapshot: string;
  service_name?: string;
  description_snapshot?: string;
  description?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount: number;
  total: number;
  sort_order?: number;
}

export interface QuotationEvent {
  id?: number;
  quotation_id?: number;
  event_id?: number;
  event_date: string;
  event_type: string;
  venue?: string;
  requirements?: string;
  sort_order?: number;
  items: QuotationItem[];
}

export interface PaymentTerm {
  id?: number;
  quotation_id?: number;
  milestone: string;
  percentage: number;
  amount: number;
  due_date?: string;
  status?: string;
}

export interface Quotation {
  id: number;
  quotation_number: string;
  client_id: number;
  quotation_date: string;
  valid_until?: string;
  subtotal: number;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  discount_amount: number;
  additional_charges: number;
  tax_enabled: number;
  tax_percentage: number;
  tax_amount: number;
  grand_total: number;
  status: QuotationStatus;
  notes?: string;
  terms?: string;
  created_by?: number;
  created_by_name?: string;
  client_name: string;
  client_mobile: string;
  client_alternate_mobile?: string;
  client_email?: string;
  client_address?: string;
  client_city?: string;
  client_state?: string;
  client_pincode?: string;
  client_code: string;
  events_count?: number;
  items_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  studio_name: string;
  tagline?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  alternate_phone?: string;
  email?: string;
  website?: string;
  gst_number?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  quotation_prefix: string;
  quotation_start_number: number;
  quotation_validity_days: number;
  currency_symbol: string;
  currency_code: string;
  tax_enabled: number;
  tax_percentage: number;
  allow_staff_custom_price: number;
  default_payment_schedule?: { milestone: string; percentage: number }[];
  default_terms?: string;
  [key: string]: any;
}

export interface AuditLog {
  id: number;
  user_id: number;
  username: string;
  action: string;
  entity: string;
  entity_id: string;
  old_value?: string;
  new_value?: string;
  ip_address?: string;
  timestamp: string;
}
