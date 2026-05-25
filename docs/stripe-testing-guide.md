# Stripe Billing — Testing Guide

> Covers: local webhook testing, test cards, CLI commands, deployment checklist.

---

## 1. Required Stripe Dashboard Setup

### 1a. Create Products & Prices

In the Stripe dashboard (or via CLI):

```bash
# Pro Monthly
stripe prices create \
  --currency usd \
  --unit-amount 4900 \
  --recurring[interval]=month \
  --product-data[name]="Alon's CRM Pro" \
  --nickname="Pro Monthly"

# Pro Yearly (20% off)
stripe prices create \
  --currency usd \
  --unit-amount 47000 \
  --recurring[interval]=year \
  --product-data[name]="Alon's CRM Pro" \
  --nickname="Pro Yearly"

# Enterprise Monthly
stripe prices create \
  --currency usd \
  --unit-amount 14900 \
  --recurring[interval]=month \
  --product-data[name]="Alon's CRM Enterprise" \
  --nickname="Enterprise Monthly"

# Enterprise Yearly
stripe prices create \
  --currency usd \
  --unit-amount 143000 \
  --recurring[interval]=year \
  --product-data[name]="Alon's CRM Enterprise" \
  --nickname="Enterprise Yearly"
```

Copy the `price_*` IDs into your environment variables (see Section 3).

### 1b. Configure Customer Portal

Dashboard → Billing → Customer portal → Settings:
- ✅ Allow customers to cancel subscriptions
- ✅ Allow customers to update payment methods
- ✅ Allow customers to view invoices
- Set "Business information" (name, support email, privacy URL)

### 1c. Configure Webhook Endpoint (Production)

Dashboard → Developers → Webhooks → Add endpoint:

**URL:** `https://your-domain.com/api/billing/webhook`

**Events to subscribe:**
```
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_succeeded
invoice.payment_failed
invoice.upcoming
```

Copy the webhook signing secret (`whsec_...`) → `STRIPE_WEBHOOK_SECRET`.

---

## 2. Local Development Setup

### 2a. Install Stripe CLI

```bash
brew install stripe/stripe-cli/stripe
stripe login
```

### 2b. Forward Webhooks Locally

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

This prints a temporary `whsec_...` key. Add it to `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_abc123...   # from stripe listen output
```

### 2c. Trigger Test Events

```bash
# Simulate a successful checkout
stripe trigger checkout.session.completed

# Simulate subscription creation
stripe trigger customer.subscription.created

# Simulate payment failure (triggers past_due)
stripe trigger invoice.payment_failed

# Simulate subscription cancellation
stripe trigger customer.subscription.deleted

# Simulate upcoming invoice
stripe trigger invoice.upcoming
```

---

## 3. Environment Variables

```bash
# .env.local (development) or Vercel Environment Variables (production)

# Required — Stripe keys
STRIPE_SECRET_KEY=sk_test_...              # from Stripe dashboard
STRIPE_WEBHOOK_SECRET=whsec_...           # from webhook endpoint or `stripe listen`

# Required — Price IDs (copy from dashboard after creating prices)
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_YEARLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_...

# Required — App URL (for success/cancel redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # dev
NEXT_PUBLIC_APP_URL=https://your-domain.com  # prod
```

---

## 4. Test Card Scenarios

All test cards use any future expiry date (e.g. `12/34`) and any 3-digit CVC.

| Scenario                     | Card Number          | Expected Result               |
|------------------------------|----------------------|-------------------------------|
| Successful payment           | `4242 4242 4242 4242` | Subscription activates        |
| Payment requires auth (3DS)  | `4000 0025 0000 3155` | Redirect to auth page         |
| Card declined                | `4000 0000 0000 9995` | Checkout fails with error     |
| Insufficient funds           | `4000 0000 0000 9995` | Checkout fails                |
| Payment fails after sub      | `4000 0000 0000 0341` | `invoice.payment_failed` fires |
| Subscription cancels itself  | Use dashboard        | `customer.subscription.deleted` |

---

## 5. End-to-End Checkout Flow Test

```bash
# 1. Start dev server + webhook forwarding in two terminals:
npm run dev
stripe listen --forward-to localhost:3000/api/billing/webhook

# 2. Create a test account via /signup

# 3. Navigate to Settings → Upgrade to Pro → "$49/mo"

# 4. In Stripe checkout, use test card: 4242 4242 4242 4242

# 5. After payment, you should be redirected to /dashboard?billing=success

# 6. Verify in DB:
# organizations table: subscription_status='active', stripe_price_id='price_...', stripe_subscription_id='sub_...'

# 7. Check webhook logs in `stripe listen` terminal — expect:
# - checkout.session.completed ✓
# - customer.subscription.created ✓
# - invoice.payment_succeeded ✓
```

---

## 6. Billing Guard Usage in API Routes

Add usage enforcement to any resource-creation route:

```typescript
import { checkBillingLimit } from '@/lib/billing-guard';

export async function POST(req: NextRequest) {
  const payload = await getSessionPayload(req);
  if (!payload?.org_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check plan limit before creating
  const guard = await checkBillingLimit(payload.org_id, 'leads');
  if (!guard.allowed) return guard.response; // 402 with upgrade URL

  // ... proceed with lead creation
}
```

For routes that should only work with an active subscription:

```typescript
import { requireActiveSubscription } from '@/lib/billing-guard';

export async function POST(req: NextRequest) {
  const subCheck = await requireActiveSubscription(payload.org_id);
  if (subCheck) return subCheck; // 402 if expired/past_due/cancelled

  // ... proceed
}
```

---

## 7. Deployment Checklist

### Before Go-Live

- [ ] Switch `STRIPE_SECRET_KEY` from `sk_test_` → `sk_live_`
- [ ] Create live prices in Stripe dashboard (they're separate from test mode)
- [ ] Update all `STRIPE_*_PRICE_ID` env vars with live price IDs
- [ ] Register production webhook URL in Stripe dashboard
- [ ] Update `STRIPE_WEBHOOK_SECRET` with the live `whsec_`
- [ ] Set `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Run DB migration: `supabase/migrations/20260527_billing_price_id.sql`
- [ ] Configure Customer Portal in Stripe (required or portal will 404)
- [ ] Test end-to-end flow with a real card on live mode before announcing

### Vercel Environment Variables to Add/Update

```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRO_MONTHLY_PRICE_ID
STRIPE_PRO_YEARLY_PRICE_ID
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID
STRIPE_ENTERPRISE_YEARLY_PRICE_ID
NEXT_PUBLIC_APP_URL
```

### Post-Deployment Verification

```bash
# Test webhook delivery from Stripe dashboard:
# Developers → Webhooks → your endpoint → Send test webhook
# → choose: customer.subscription.updated

# Verify response is 200 in the webhook log
# Verify organizations table updated in Supabase dashboard
```

---

## 8. Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `400 Invalid signature` on webhook | Wrong `STRIPE_WEBHOOK_SECRET` | Use `stripe listen` output in dev; live `whsec_` in prod |
| `503 Billing not available` | `STRIPE_SECRET_KEY` not set | Add to env vars |
| Checkout session has no URL | Price ID env var missing | Set `STRIPE_PRO_MONTHLY_PRICE_ID` etc. |
| Portal returns 404 | Customer Portal not configured | Dashboard → Billing → Customer portal → Activate |
| Plan stays "free" after payment | `stripe_price_id` not saved | Check webhook logs; ensure `customer.subscription.created` fires |
| Trial doesn't carry over | `trial_ends_at` null in DB | Check signup route sets `trial_ends_at` |
