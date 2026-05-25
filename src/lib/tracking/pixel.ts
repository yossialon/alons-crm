/**
 * Meta Pixel tracking library
 * ─────────────────────────────────────────────────────────────────────────────
 * RULES:
 *   - All fbq() calls go through this module.
 *   - Never import or call fbq() directly in components or pages.
 *   - Every function is a no-op when NEXT_PUBLIC_META_PIXEL_ID is unset,
 *     so the app works in staging/preview without a pixel.
 *
 * CAPI READINESS:
 *   Each browser-pixel function has a matching sendToCAPI() stub below it.
 *   To add server-side deduplication, uncomment and implement /api/tracking/capi.
 *   The event_id should be shared between the browser call and the CAPI call
 *   so Meta can deduplicate them (see Meta's "deduplication" docs).
 */

// ── Global fbq type ───────────────────────────────────────────────────────────
declare global {
  interface Window {
    fbq:  Fbq;
    _fbq: Fbq;
  }
}

type FbqCommand = 'init' | 'track' | 'trackCustom' | 'trackSingle';

interface Fbq {
  (...args: [FbqCommand, string, ...unknown[]]): void;
  callMethod?: (...args: unknown[]) => void;
  queue:       unknown[][];
  loaded:      boolean;
  version:     string;
  push:        (...args: unknown[]) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '';

/** Safe fbq caller — no-op on server or before the pixel script loads. */
function fbq(command: FbqCommand, event: string, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  if (data !== undefined) {
    window.fbq(command, event, data);
  } else {
    window.fbq(command, event);
  }
}

/** Generates a random event ID for browser↔CAPI deduplication. */
function eventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Standard event data types ─────────────────────────────────────────────────

export interface LeadData {
  /** Human-readable name shown in Events Manager, e.g. 'Kitchen Quote' */
  content_name?:     string;
  content_category?: string;
  /** Estimated lead value in USD */
  value?:            number;
  currency?:         string;
}

export interface ContactData {
  content_name?: string;
}

export interface PurchaseData {
  /** Required by Meta — order total */
  value:         number;
  currency?:     string;
  content_ids?:  string[];
  content_type?: string;
  order_id?:     string;
  num_items?:    number;
}

export interface ViewContentData {
  content_ids?:      string[];
  content_type?:     string;
  content_name?:     string;
  content_category?: string;
  value?:            number;
  currency?:         string;
}

export interface CustomEventData {
  [key: string]: unknown;
}

// ── Tracking functions ────────────────────────────────────────────────────────

/**
 * PageView — fires on first load AND on every client-side navigation.
 * Called automatically by <MetaPixel /> on pathname changes.
 * Can be called manually for virtual page changes (e.g. tab switches).
 */
export function trackPageView(): void {
  if (!PIXEL_ID) return;
  fbq('track', 'PageView');

  // CAPI stub:
  // void sendToCAPI('PageView', {}, eventId());
}

/**
 * Lead — fire when a lead form is submitted.
 * Maps to Meta's standard Lead event which optimises for lead campaigns.
 *
 * Usage:
 *   import { trackLead } from '@/lib/tracking/pixel';
 *   trackLead({ content_name: 'Kitchen Quote', value: 500 });
 */
export function trackLead(data?: LeadData): void {
  if (!PIXEL_ID) return;
  const id = eventId();
  fbq('track', 'Lead', {
    content_name:     data?.content_name     ?? 'Lead Form',
    content_category: data?.content_category,
    value:            data?.value,
    currency:         data?.currency         ?? 'USD',
    eventID:          id,                    // used for CAPI deduplication
  });

  // CAPI stub:
  // void sendToCAPI('Lead', { ...data }, id);
}

/**
 * Contact — fire when a user contacts the business directly
 * (WhatsApp click, phone click, contact form submit).
 */
export function trackContact(data?: ContactData): void {
  if (!PIXEL_ID) return;
  const id = eventId();
  fbq('track', 'Contact', { ...data, eventID: id });

  // CAPI stub:
  // void sendToCAPI('Contact', { ...data }, id);
}

/**
 * Purchase — fire when payment is confirmed / subscription starts.
 * `value` is required by Meta for purchase optimization.
 */
export function trackPurchase(data: PurchaseData): void {
  if (!PIXEL_ID) return;
  const id = eventId();
  fbq('track', 'Purchase', {
    value:        data.value,
    currency:     data.currency     ?? 'USD',
    content_ids:  data.content_ids,
    content_type: data.content_type ?? 'product',
    num_items:    data.num_items,
    order_id:     data.order_id,
    eventID:      id,
  });

  // CAPI stub:
  // void sendToCAPI('Purchase', { ...data }, id);
}

/**
 * ViewContent — fire when a user views a key page or product detail.
 */
export function trackViewContent(data?: ViewContentData): void {
  if (!PIXEL_ID) return;
  const id = eventId();
  fbq('track', 'ViewContent', { ...data, eventID: id });

  // CAPI stub:
  // void sendToCAPI('ViewContent', { ...data }, id);
}

/**
 * Custom event — for events not in Meta's standard set.
 * Appears in Events Manager but cannot be used for campaign bidding directly.
 * Use standard events (Lead, Purchase, etc.) wherever possible.
 */
export function trackCustomEvent(name: string, data?: CustomEventData): void {
  if (!PIXEL_ID) return;
  const id = eventId();
  fbq('trackCustom', name, { ...data, eventID: id });

  // CAPI stub:
  // void sendToCAPI(name, { ...data }, id);
}

// ── CAPI stub ─────────────────────────────────────────────────────────────────
// Uncomment every `void sendToCAPI(...)` line above and implement this
// function to enable server-side event mirroring.
//
// The /api/tracking/capi route (already stubbed) forwards events to:
//   POST https://graph.facebook.com/v19.0/{PIXEL_ID}/events
//
// CRITICAL: pass the same eventID to both browser fbq() and sendToCAPI()
// so Meta deduplicates them. Without this, every event is counted twice.
//
// async function sendToCAPI(
//   eventName: string,
//   data:      Record<string, unknown>,
//   id:        string,
// ): Promise<void> {
//   try {
//     await fetch('/api/tracking/capi', {
//       method:  'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body:    JSON.stringify({
//         eventName,
//         eventId:        id,
//         eventTime:      Math.floor(Date.now() / 1000),
//         eventSourceUrl: typeof window !== 'undefined' ? window.location.href : '',
//         userData:       {}, // add hashed email / phone from session when available
//         customData:     data,
//       }),
//     });
//   } catch (err) {
//     console.error('[pixel] CAPI send failed:', err);
//   }
// }
