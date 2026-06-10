"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0A0A0A",
        color: "#fff",
        padding: "2rem",
      }}
    >
      <h2 style={{ color: "#C9A96E", marginBottom: "1rem", fontSize: "1.5rem" }}>
        Something went wrong
      </h2>
      <p style={{ marginBottom: "2rem", opacity: 0.7, textAlign: "center", maxWidth: "400px" }}>
        We&apos;re sorry for the inconvenience. Please try again.
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
      <Link
        href="/"
        style={{ marginTop: "1rem", color: "#C9A96E", textDecoration: "underline" }}
      >
        Go to Home
      </Link>
    </div>
  );
}
