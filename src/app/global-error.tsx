'use client';

// Replaces the root layout when it fails, so it needs its own <html> (UX-3).
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          minHeight: '100vh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          padding: '1rem',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Something went wrong</h1>
        <p>The site could not be loaded. Please try again in a moment.</p>
        {error.digest ? (
          <p style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>Reference: {error.digest}</p>
        ) : null}
        <button type="button" onClick={() => retry()} style={{ padding: '0.5rem 1rem' }}>
          Try again
        </button>
      </body>
    </html>
  );
}
