"use client";

import { createContext, useContext, type ReactNode } from "react";

const PublishedCatalogPathsContext = createContext<readonly string[]>([]);

export function PublishedCatalogProvider({
  paths,
  children,
}: {
  paths: readonly string[];
  children: ReactNode;
}) {
  return (
    <PublishedCatalogPathsContext.Provider value={paths}>
      {children}
    </PublishedCatalogPathsContext.Provider>
  );
}

export function useInitialPublishedCatalogPaths(): readonly string[] {
  return useContext(PublishedCatalogPathsContext);
}
