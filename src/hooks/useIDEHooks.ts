import { useEffect, useState } from 'react';
import { useIDEStore } from '../store/useIDEStore';

export function useIsMobileViewport(breakpointPx = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpointPx : false
  );

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < breakpointPx);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpointPx]);

  return isMobile;
}

export function useGlobalKeyboardShortcuts(): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const store = useIDEStore.getState();

      if (mod && e.key.toLowerCase() === 'p' && !e.shiftKey) {
        e.preventDefault();
        store.setCommandPaletteOpen(!store.commandPaletteOpen);
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        store.setCommandPaletteOpen(true);
      } else if (mod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        store.setSidebarOpen(!store.sidebarOpen);
      } else if (mod && e.key === '`') {
        e.preventDefault();
        store.setBottomTerminalOpen(!store.bottomTerminalOpen);
      } else if (mod && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        store.setGoToLineOpen(true);
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        store.setSidebarPanel('search');
      } else if (mod && e.key.toLowerCase() === 'w') {
        if (store.activeRoute === 'editor' && store.activeTabId) {
          e.preventDefault();
          store.closeTab(store.activeTabId);
        }
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        store.reopenClosedTab();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
