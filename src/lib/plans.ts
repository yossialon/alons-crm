export type PlanId = 'free' | 'pro' | 'enterprise';

export interface PlanLimits {
  leads: number;
  campaigns: number;
  automations: number;
  social_connections: number;
  team_members: number;
}

export interface Plan {
  id: PlanId;
  name: string;
  price_monthly: number;
  price_yearly: number;
  limits: PlanLimits;
  features: string[];
  stripe_price_monthly: string | undefined;
  stripe_price_yearly: string | undefined;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    price_monthly: 0,
    price_yearly: 0,
    stripe_price_monthly: undefined,
    stripe_price_yearly: undefined,
    limits: { leads: 50, campaigns: 2, automations: 1, social_connections: 0, team_members: 1 },
    features: ['50 leads', '2 campaigns', '1 automation', 'Basic CRM'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price_monthly: 49,
    price_yearly: 470,
    stripe_price_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    stripe_price_yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    limits: { leads: 2000, campaigns: 20, automations: 10, social_connections: 3, team_members: 5 },
    features: ['2,000 leads', '20 campaigns', '10 automations', 'Social inbox (3 platforms)', '5 team members'],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price_monthly: 149,
    price_yearly: 1430,
    stripe_price_monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
    stripe_price_yearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
    limits: { leads: Infinity, campaigns: Infinity, automations: Infinity, social_connections: Infinity, team_members: Infinity },
    features: ['Unlimited leads', 'Unlimited campaigns', 'Unlimited automations', 'All social platforms', 'Unlimited team members'],
  },
};

export function getPlan(id: string): Plan {
  return PLANS[id as PlanId] ?? PLANS.free;
}

export type UsageResource = 'leads' | 'campaigns' | 'automations' | 'social_connections' | 'team_members';

export function isWithinLimit(plan: PlanId, resource: UsageResource, current: number): boolean {
  const limit = PLANS[plan].limits[resource];
  return limit === Infinity || current < limit;
}
