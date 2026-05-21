// ── Agent System Types ────────────────────────────────────────────────────────

export type AgentName = 'lead-hunter' | 'ad-machine' | 'tech-manager' | 'boss';
export type AgentStatus = 'running' | 'success' | 'error' | 'partial';
export type HealthStatus = 'ok' | 'warn' | 'error';

export interface AgentRun {
  id: string;
  org_id?: string;
  agent_name: AgentName;
  status: AgentStatus;
  trigger: 'cron' | 'manual' | 'webhook';
  started_at: string;
  finished_at?: string;
  duration_ms?: number;
  summary?: string;
  leads_found: number;
  leads_imported: number;
  errors: string[];
  metadata: Record<string, unknown>;
}

export interface HealthCheck {
  name: string;
  status: HealthStatus;
  value_ms?: number;
  details?: string;
}

export interface LeadSource {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  source: string;
  score: number;
  notes?: string;
  raw?: Record<string, unknown>;
}

export interface TechRecommendation {
  category: 'performance' | 'cost' | 'reliability' | 'feature';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
}

export interface CampaignRecommendation {
  platform: string;
  insight: string;
  action: string;
  impact: 'low' | 'medium' | 'high';
}
