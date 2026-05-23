"use client";

import { ReactNode } from "react";
import { PageViewTracker } from "@/components/page-view-tracker";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      <PageViewTracker />
      {children}
    </>
  );
}
