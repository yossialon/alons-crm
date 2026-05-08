export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  type: 'Homeowner' | 'Contractor' | 'Developer';
  area: string;
  status: 'new' | 'contacted' | 'qualified' | 'closed';
  source: string;
  notes: string;
  website: string;
  rating: string;
  potential: 'high' | 'medium' | 'low';
  date: string;
  created_at?: string;
  updated_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  category: string;
  status: 'active' | 'pending' | 'inactive';
  notes: string;
  last_contact: string;
  created_at?: string;
  updated_at?: string;
}

export interface ScanResult {
  id: string;
  name: string;
  phone: string;
  email: string;
  website: string;
  area: string;
  type: string;
  source: string;
  rating: string;
  potential: string;
  notes: string;
  scan_date: string;
  imported: boolean;
}

export interface ToastState {
  msg: string;
  ok: boolean;
}
