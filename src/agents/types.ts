// ── Agent System Types ────────────────────────────────────────────────────────

export type AgentName = 'lead-hunter' | 'ad-machine' | 'tech-manager' | 'boss';
export type AgentStatus = 'running' | 'success' | 'error' | 'partial';
export type HealthStatus = 'ok' | 'warn' | 'error';

/** How a run was initiated. 'auto-delegation' = one agent delegated to another. */
export type AgentTrigger = 'cron' | 'manual' | 'webhook' | 'auto-delegation';

export type AgentTaskStatus = 'pending' | 'processing' | 'done' | 'failed';

/**
 * Known task_type values for agent_tasks rows.
 * Extend as new inter-agent workflows are added.
 */
export type AgentTaskType =
  | 'new_leads_imported'  // lead-hunter → ad-machine: N new leads were imported
  | 'job_completed'       // ad-machine: trigger social posting for a finished job
  | 'review_request'      // ad-machine: request a Google review from a customer
  | 'geo_campaign_trigger'; // lead-hunter → ad-machine: launch geo ad for a new city

/** A row in the agent_tasks table (async work queue between agents). */
export interface AgentTask {
  id:           string;
  org_id?:      string;
  from_agent:   AgentName;
  to_agent:     AgentName;
  task_type:    AgentTaskType | string;   // string fallback for forward-compat
  payload:      Record<string, unknown>;
  status:       AgentTaskStatus;
  created_at:   string;
  started_at?:  string;
  finished_at?: string;
  error?:       string;
}

export interface AgentRun {
  id: string;
  org_id?: string;
  agent_name: AgentName;
  status: AgentStatus;
  trigger: AgentTrigger;
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
  platform:   string;
  insight:    string;
  action:     string;
  impact:     'low' | 'medium' | 'high';
  /** Probability 0.0–1.0 that this rec will increase leads, from historical analysis. NULL = insufficient history. */
  confidence?: number;
}

/** A Meta Ads campaign created by the ad-machine agent */
export interface MetaAdCampaign {
  campaignId:  string;
  adSetId:     string;
  creativeId:  string;
  adId:        string;
  status:      'ACTIVE' | 'PAUSED';
  dailyBudget: number;
  name:        string;
  skipped?:    boolean;  // true when deduplication found an existing recent campaign
}

/** A pattern extracted from historical campaign data during the weekly learning pass. */
export interface CampaignLearning {
  week_of:          string;   // ISO date (YYYY-MM-DD) of the review week
  pattern:          string;   // human-readable pattern description
  confidence_score: number;   // 0.0–1.0
  based_on_weeks:   number;   // how many historical weeks the pattern was observed
  reasoning?:       string;   // Claude's plain-language reasoning
}
