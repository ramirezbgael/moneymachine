import React, { createContext, useContext, useMemo } from 'react'

const LayoutNavContext = createContext({
  openMobileSidebar: () => {},
  closeMobileSidebar: () => {}
})

export function LayoutNavProvider({ children, openMobileSidebar, closeMobileSidebar }) {
  const value = useMemo(
    () => ({
      openMobileSidebar: openMobileSidebar || (() => {}),
      closeMobileSidebar: closeMobileSidebar || (() => {})
    }),
    [openMobileSidebar, closeMobileSidebar]
  )
  return <LayoutNavContext.Provider value={value}>{children}</LayoutNavContext.Provider>
}

export function useLayoutNav() {
  return useContext(LayoutNavContext)
}
