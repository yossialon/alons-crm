// ── Core CRM entity types ────────────────────────────────────────────────────
// These mirror the PostgreSQL schema columns.  All IDs are UUIDs.

export interface Lead {
  id:         string;
  org_id:     string;
  name:       string;
  phone:      string;
  email:      string;
  type:       'Homeowner' | 'Contractor' | 'Developer';
  area:       string;
  status:     'new' | 'contacted' | 'qualified' | 'closed';
  source:     string;
  notes:      string;
  website:    string;
  rating:     string;
  potential:  'high' | 'medium' | 'low';
  date:       string | null;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id:           string;
  org_id:       string;
  name:         string;
  contact:      string;
  phone:        string;
  email:        string;
  category:     string;
  status:       'active' | 'pending' | 'inactive';
  notes:        string;
  last_contact: string | null;
  created_at:   string;
  updated_at:   string;
}

export interface ScanResult {
  id:          string;
  org_id:      string;
  name:        string;
  phone:       string;
  email:       string;
  website:     string;
  area:        string;
  type:        string;
  source:      string;
  rating:      string;
  potential:   string;
  notes:       string;
  scan_date:   string;
  imported:    boolean;
  imported_as: string | null;
  created_at:  string;
}

export type SocialPlatform = 'facebook' | 'instagram' | 'whatsapp' | 'linkedin' | 'tiktok';

export interface SocialConnection {
  id:           string;
  org_id:       string;
  platform:     SocialPlatform;
  account_name: string;
  account_id:   string;
  page_id:      string | null;
  page_name:    string | null;
  token_expiry: string | null;
  metadata:     Record<string, unknown>;
  created_at:   string;
  updated_at:   string;
}

export interface SocialMessage {
  id:            string;
  org_id:        string;
  connection_id: string;
  platform:      SocialPlatform;
  external_id:   string;
  thread_id:     string;
  direction:     'inbound' | 'outbound';
  sender_id:     string;
  sender_name:   string;
  sender_avatar: string | null;
  content:       string;
  attachments:   unknown[];
  read_at:       string | null;
  replied_at:    string | null;
  lead_id:       string | null;
  created_at:    string;
  // joined fields
  account_name?: string;
  page_name?:    string | null;
}

export interface Client {
  id:         string;
  org_id:     string;
  lead_id:    string | null;
  name:       string;
  phone:      string;
  email:      string;
  address:    string;
  notes:      string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id:          string;
  org_id:      string;
  client_id:   string | null;
  lead_id:     string | null;
  name:        string;
  status:      'estimate' | 'active' | 'completed' | 'cancelled';
  budget:      number | null;
  start_date:  string | null;
  end_date:    string | null;
  notes:       string;
  client_name: string | null; // joined
  created_at:  string;
  updated_at:  string;
}

export interface Task {
  id:          string;
  org_id:      string;
  lead_id:     string | null;
  project_id:  string | null;
  client_id:   string | null;
  title:       string;
  description: string;
  status:      'open' | 'in_progress' | 'done';
  priority:    'high' | 'medium' | 'low';
  due_date:    string | null;
  created_at:  string;
  updated_at:  string;
}

export interface OutreachEntry {
  id:           string;
  org_id:       string;
  lead_id:      string;
  method:       'email' | 'phone' | 'sms' | 'in_person' | 'social';
  direction:    'outbound' | 'inbound';
  outcome:      'no_answer' | 'callback' | 'interested' | 'not_interested' | 'follow_up' | 'converted' | null;
  notes:        string;
  actor_name:   string;
  contacted_at: string;
  created_at:   string;
}

export type OutreachChannel = 'email' | 'sms' | 'whatsapp';

export interface MessageTemplate {
  id:         string;
  org_id:     string;
  name:       string;
  channel:    OutreachChannel;
  subject:    string;
  body:       string;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id:            string;
  org_id:        string;
  name:          string;
  template_id:   string | null;
  channel:       OutreachChannel;
  status:        'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';
  target_filter: Record<string, unknown>;
  scheduled_at:  string | null;
  sent_count:    number;
  open_count:    number;
  click_count:   number;
  template_name?: string; // joined
  created_at:    string;
  updated_at:    string;
}

export interface ScheduledOutreach {
  id:           string;
  org_id:       string;
  lead_id:      string;
  template_id:  string | null;
  channel:      OutreachChannel;
  subject:      string;
  message:      string;
  scheduled_at: string;
  status:       'pending' | 'sent' | 'cancelled' | 'failed';
  sent_at:      string | null;
  error:        string | null;
  created_at:   string;
  lead_name?:   string; // joined
}

export interface AutomationRule {
  id:            string;
  org_id:        string;
  name:          string;
  enabled:       boolean;
  trigger_type:  'days_since_created' | 'days_since_contact' | 'status_is';
  trigger_value: string;
  lead_filter:   Record<string, unknown>;
  template_id:   string | null;
  channel:       OutreachChannel;
  created_at:    string;
  updated_at:    string;
  template_name?: string; // joined
}

export interface AuditEntry {
  id:          string;
  org_id:      string;
  actor_name:  string;
  action:      'create' | 'update' | 'delete' | 'import' | 'login' | 'logout';
  entity_type: string;
  entity_id:   string | null;
  diff:        Record<string, unknown> | null;
  ip:          string;
  created_at:  string;
}

// ── UI-only types ─────────────────────────────────────────────────────────────

export interface ToastState {
  msg: string;
  ok:  boolean;
}
