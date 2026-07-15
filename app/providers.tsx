"use client";

import { ReactNode } from "react";
import dynamic from "next/dynamic";

const PageViewTracker = dynamic(
  () => import("@/components/page-view-tracker").then((m) => ({ default: m.PageViewTracker })),
  { ssr: false }
);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      <PageViewTracker />
      {children}
    </>
  );
}
