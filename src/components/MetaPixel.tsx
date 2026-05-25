'use client';

/**
 * MetaPixel — global pixel loader + route-change PageView tracker.
 *
 * Responsibilities:
 *   1. Inject fbevents.js exactly once via next/script (id="meta-pixel"
 *      prevents Next.js from injecting the same script twice).
 *   2. Call fbq('init') and the FIRST PageView inside the script tag so
 *      the event fires as soon as the pixel library is ready.
 *   3. Watch pathname with usePathname() and fire a PageView on every
 *      subsequent client-side navigation — but NOT on the first render
 *      (that would double-fire with the PageView in the script tag).
 *
 * Duplication prevention:
 *   - Script `if(f.fbq)return` guard:  prevents re-init if rendered twice.
 *   - next/script id deduplication:    Next.js silently drops a second
 *     <Script> with the same id on the same page.
 *   - isFirstRender ref:               skips the effect on mount so the
 *     inline PageView and the effect-PageView never both fire for the
 *     same URL, even in React Strict Mode (which mounts twice in dev).
 */

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { trackPageView } from '@/lib/tracking/pixel';

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export default function MetaPixel() {
  const pathname      = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // First mount: the Script tag's fbq('track','PageView') already fired.
    // React Strict Mode mounts twice in dev — the ref stays false on the
    // second mount cycle, so neither cycle triggers a duplicate.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Every subsequent pathname change = client-side navigation → fire PageView.
    trackPageView();
  }, [pathname]);

  // Nothing to render if pixel ID is not configured (staging / PR previews).
  if (!PIXEL_ID) return null;

  return (
    <>
      {/*
       * strategy="afterInteractive" — defers the script until after hydration.
       * This is the correct strategy for analytics: it does not block
       * the initial render or SSR streaming.
       *
       * The fbq('init') and first fbq('track','PageView') live here so they
       * run as part of the script load, before React effects fire.
       */}
      <Script id="meta-pixel" strategy="afterInteractive">{`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window,document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init','${PIXEL_ID}');
        fbq('track','PageView');
      `}</Script>

      {/* Fallback for browsers with JavaScript disabled */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1" width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
