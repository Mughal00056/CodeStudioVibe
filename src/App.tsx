import React, { useEffect, useState } from 'react';
import { HashRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useIDEStore } from './store/useIDEStore';
import { ThemeProvider, useIDETheme } from './context/ThemeContext';
import { useGlobalKeyboardShortcuts } from './hooks/useIDEHooks';
import { IDEHeader } from './components/Header/IDEHeader';
import { MobileBottomNav } from './components/BottomNavigation/MobileBottomNav';
import { IDESidebar } from './components/Sidebar/IDESidebar';
import { IDEStatusBar } from './components/StatusBar/IDEStatusBar';
import { CommandPalette } from './components/CommandPalette/CommandPalette';
import { NewProjectModal, ToastContainer } from './components/Dialogs/IDEModals';
import { HomePage } from './pages/Home/HomePage';
import { EditorPage } from './pages/Editor/EditorPage';
import { ProjectsPage } from './pages/Projects/ProjectsPage';
import { TerminalPage } from './pages/Terminal/TerminalPage';
import { PreviewPage } from './pages/Preview/PreviewPage';
import { PluginsPage } from './pages/Plugins/PluginsPage';
import { GitHubPage } from './pages/GitHub/GitHubPage';
import { SettingsPage } from './pages/Settings/SettingsPage';

const IDEShell: React.FC = () => {
  const theme = useIDETheme();
  const hydrated = useIDEStore((s) => s.hydrated);
  const hydrate = useIDEStore((s) => s.hydrate);
  const activeRoute = useIDEStore((s) => s.activeRoute);
  const setActiveRoute = useIDEStore((s) => s.setActiveRoute);
  const activeTabId = useIDEStore((s) => s.activeTabId);
  const formatTabWithPrettier = useIDEStore((s) => s.formatTabWithPrettier);

  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);

  useGlobalKeyboardShortcuts();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Android Hardware Back Button Handling via Capacitor App Plugin if present
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const plugins = (window as unknown as {
      Capacitor?: {
        Plugins?: {
          App?: {
            addListener: (
              ev: 'backButton',
              cb: (data: { canGoBack: boolean }) => void
            ) => Promise<{ remove: () => void }>;
            exitApp: () => void;
          };
        };
      };
    }).Capacitor?.Plugins;

    let handle: { remove: () => void } | undefined;
    plugins?.App?.addListener('backButton', () => {
      const store = useIDEStore.getState();
      if (store.commandPaletteOpen) {
        store.setCommandPaletteOpen(false);
        return;
      }
      if (store.sidebarOpen && window.innerWidth < 1024) {
        store.setSidebarOpen(false);
        return;
      }
      if (store.activeRoute !== 'home') {
        store.setActiveRoute('home');
        return;
      }
      plugins.App?.exitApp();
    }).then((h) => {
      handle = h;
    });

    return () => {
      handle?.remove();
    };
  }, []);

  if (!hydrated) {
    return (
      <div
        className="h-full w-full flex items-center justify-center text-xs font-medium"
        style={{
          backgroundColor: theme.ui.bgPrimary,
          color: theme.ui.textSecondary,
        }}
      >
        Loading CodeX Studio...
      </div>
    );
  }

  const renderPage = () => {
    switch (activeRoute) {
      case 'home':
        return <HomePage onOpenNewProjectModal={() => setNewProjectModalOpen(true)} />;
      case 'editor':
        return <EditorPage onNewProject={() => setNewProjectModalOpen(true)} />;
      case 'projects':
        return <ProjectsPage onOpenNewProjectModal={() => setNewProjectModalOpen(true)} />;
      case 'terminal':
        return <TerminalPage />;
      case 'preview':
        return <PreviewPage />;
      case 'plugins':
        return <PluginsPage />;
      case 'github':
        return <GitHubPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <HomePage onOpenNewProjectModal={() => setNewProjectModalOpen(true)} />;
    }
  };

  return (
    <div
      className="h-full w-full flex flex-col overflow-hidden"
      style={{
        backgroundColor: theme.ui.bgPrimary,
        color: theme.ui.textPrimary,
      }}
    >
      <IDEHeader onNewProjectClick={() => setNewProjectModalOpen(true)} />

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <IDESidebar
          onGoToLine={() => {
            if (activeRoute !== 'editor') setActiveRoute('editor');
          }}
        />
        <main className="flex-1 min-w-0 h-full overflow-hidden">
          {renderPage()}
        </main>
      </div>

      <IDEStatusBar />
      <MobileBottomNav />

      <CommandPalette
        onNewProject={() => setNewProjectModalOpen(true)}
        onFormatActive={() => {
          if (activeTabId) formatTabWithPrettier(activeTabId);
        }}
      />

      <NewProjectModal
        open={newProjectModalOpen}
        onClose={() => setNewProjectModalOpen(false)}
      />

      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <IDEShell />
      </ThemeProvider>
    </HashRouter>
  );
}
