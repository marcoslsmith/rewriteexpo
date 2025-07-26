import React, { createContext, useContext, useState, useCallback } from 'react';

const ManifestationContext = createContext({
  refreshKey: 0,
  triggerRefresh: () => {},
});

export function ManifestationProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <ManifestationContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </ManifestationContext.Provider>
  );
}

export function useManifestationRefresh() {
  return useContext(ManifestationContext);
} 