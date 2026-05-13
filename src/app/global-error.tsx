"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    // Next.js catches root layout errors before Sentry — must capture manually
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        {/* App Router doesn't expose HTTP status codes, so pass 0 for a generic message */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
