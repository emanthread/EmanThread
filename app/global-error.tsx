"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body
        style={{
          background: "#0A0A0A",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          margin: 0,
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h2 style={{ color: "#C9A96E", marginBottom: "1rem" }}>
          Critical Error
        </h2>
        <p style={{ marginBottom: "2rem", opacity: 0.7, textAlign: "center", maxWidth: "400px" }}>
          A critical error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          style={{
            background: "#C9A96E",
            color: "#000",
            padding: "0.75rem 2rem",
            border: "none",
            cursor: "pointer",
            borderRadius: "8px",
            fontWeight: 600,
          }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
