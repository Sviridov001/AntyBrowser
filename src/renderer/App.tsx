import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { ProfilesView } from './components/ProfilesView';
import { ProfileModal } from './components/ProfileModal';
import { ProxyView } from './components/ProxyView';
import { ProxyModal } from './components/ProxyModal';
import { CookieModal } from './components/CookieModal';
import { ApiView } from './components/ApiView';
import { SettingsView } from './components/SettingsView';
import { ExtensionsView } from './components/ExtensionsView';
import { ToastContainer, ToastMessage } from './components/Toast';
import { Profile, ProxyItem } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('profiles');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [proxies, setProxies] = useState<ProxyItem[]>([]);
  const [apiPort, setApiPort] = useState(3001);

  // Modals state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  const [isProxyModalOpen, setIsProxyModalOpen] = useState(false);
  const [editingProxy, setEditingProxy] = useState<ProxyItem | null>(null);

  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);
  const [cookieProfile, setCookieProfile] = useState<Profile | null>(null);

  // Toast state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initial data loading & periodic sync
  const loadData = async () => {
    if (!window.antyApi) return;
    try {
      const [pList, prList, s] = await Promise.all([
        window.antyApi.getProfiles(),
        window.antyApi.getProxies(),
        window.antyApi.getSettings(),
      ]);
      setProfiles(pList);
      setProxies(prList);
      if (s && s.api_port) setApiPort(s.api_port);
    } catch (err: any) {
      console.error('Error loading initial data:', err);
    }
  };

  useEffect(() => {
    loadData();
    // Poll running status periodically
    const interval = setInterval(async () => {
      if (window.antyApi) {
        try {
          const running = await window.antyApi.getRunningProfiles();
          const runningMap = new Map(running.map((r) => [r.profileId, r]));
          setProfiles((prev) =>
            prev.map((p) => {
              const r = runningMap.get(p.id);
              const isRun = !!r;
              if (
                (p.status === 'running') !== isRun ||
                p.cdp_port !== (r ? r.cdpPort : undefined)
              ) {
                return {
                  ...p,
                  status: isRun ? 'running' : 'stopped',
                  cdp_port: r ? r.cdpPort : undefined,
                  ws_endpoint: r ? r.wsEndpoint : undefined,
                };
              }
              return p;
            })
          );
        } catch (e) {
          // ignore
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // Profile actions
  const handleStartProfile = async (id: string) => {
    try {
      showToast('Запуск профиля Chromium...', 'info');
      await window.antyApi.startProfile(id);
      showToast('Профиль успешно запущен!', 'success');
      loadData();
    } catch (err: any) {
      showToast('Ошибка запуска: ' + err.message, 'error');
    }
  };

  const handleStopProfile = async (id: string) => {
    try {
      await window.antyApi.stopProfile(id);
      showToast('Профиль остановлен, cookies синхронизированы', 'info');
      loadData();
    } catch (err: any) {
      showToast('Ошибка остановки: ' + err.message, 'error');
    }
  };

  const handleSaveProfile = async (profileData: Partial<Profile>, initialCookies?: string) => {
    try {
      const saved = await window.antyApi.saveProfile(profileData);
      if (initialCookies) {
        await window.antyApi.importCookies(saved.id, initialCookies);
      }
      showToast('Профиль сохранён', 'success');
      loadData();
    } catch (err: any) {
      showToast('Ошибка сохранения: ' + err.message, 'error');
    }
  };

  const handleCloneProfile = async (id: string) => {
    try {
      await window.antyApi.cloneProfile(id);
      showToast('Профиль успешно клонирован!', 'success');
      loadData();
    } catch (err: any) {
      showToast('Ошибка клонирования: ' + err.message, 'error');
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот профиль и все связанные с ним данные?')) {
      try {
        await window.antyApi.deleteProfile(id);
        showToast('Профиль удалён', 'info');
        loadData();
      } catch (err: any) {
        showToast('Ошибка удаления: ' + err.message, 'error');
      }
    }
  };

  // Batch actions
  const handleStartAll = async () => {
    const stoppedProfiles = profiles.filter((p) => p.status !== 'running');
    if (stoppedProfiles.length === 0) return;
    showToast(`Запуск ${stoppedProfiles.length} профилей...`, 'info');
    for (const p of stoppedProfiles) {
      try {
        await window.antyApi.startProfile(p.id);
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  };

  const handleStopAll = async () => {
    const runningProfiles = profiles.filter((p) => p.status === 'running');
    if (runningProfiles.length === 0) return;
    showToast(`Остановка ${runningProfiles.length} профилей...`, 'info');
    for (const p of runningProfiles) {
      try {
        await window.antyApi.stopProfile(p.id);
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  };

  // Proxy actions
  const handleSaveProxy = async (proxyData: Partial<ProxyItem>) => {
    try {
      await window.antyApi.saveProxy(proxyData);
      showToast('Прокси сохранён', 'success');
      loadData();
    } catch (err: any) {
      showToast('Ошибка сохранения прокси: ' + err.message, 'error');
    }
  };

  const handleDeleteProxy = async (id: string) => {
    if (confirm('Удалить выбранный прокси?')) {
      try {
        await window.antyApi.deleteProxy(id);
        showToast('Прокси удалён', 'info');
        loadData();
      } catch (err: any) {
        showToast('Ошибка удаления прокси: ' + err.message, 'error');
      }
    }
  };

  const handleCheckProxy = async (proxy: ProxyItem) => {
    try {
      const res = await window.antyApi.checkProxy(proxy);
      if (res.success) {
        showToast(`Прокси [${proxy.name}] активен (${res.latency}ms, IP: ${res.ip})`, 'success');
      } else {
        showToast(`Ошибка подключения к [${proxy.name}]: ${res.error}`, 'error');
      }
      loadData();
      return res;
    } catch (err: any) {
      showToast('Ошибка проверки прокси: ' + err.message, 'error');
    }
  };

  const runningCount = profiles.filter((p) => p.status === 'running').length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0b0f19] text-[#f1f5f9]">
      {/* Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        runningCount={runningCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={
            currentTab === 'profiles'
              ? 'Браузерные Профили'
              : currentTab === 'proxies'
              ? 'Управление Прокси'
              : currentTab === 'extensions'
              ? 'Расширения Chromium'
              : currentTab === 'api'
              ? 'Playwright Автоматизация'
              : 'Настройки и Бэкапы'
          }
          subtitle={
            currentTab === 'profiles'
              ? 'Управление независимыми цифровыми личностями и отпечатками'
              : undefined
          }
          runningCount={runningCount}
          onStartAll={currentTab === 'profiles' ? handleStartAll : undefined}
          onStopAll={currentTab === 'profiles' ? handleStopAll : undefined}
          apiPort={apiPort}
        />

        {/* View Switcher */}
        {currentTab === 'profiles' && (
          <ProfilesView
            profiles={profiles}
            proxies={proxies}
            onStartProfile={handleStartProfile}
            onStopProfile={handleStopProfile}
            onCreateProfile={() => {
              setEditingProfile(null);
              setIsProfileModalOpen(true);
            }}
            onEditProfile={(p) => {
              setEditingProfile(p);
              setIsProfileModalOpen(true);
            }}
            onCloneProfile={handleCloneProfile}
            onDeleteProfile={handleDeleteProfile}
            onOpenCookies={(p) => {
              setCookieProfile(p);
              setIsCookieModalOpen(true);
            }}
          />
        )}

        {currentTab === 'proxies' && (
          <ProxyView
            proxies={proxies}
            onAddProxy={() => {
              setEditingProxy(null);
              setIsProxyModalOpen(true);
            }}
            onEditProxy={(pr) => {
              setEditingProxy(pr);
              setIsProxyModalOpen(true);
            }}
            onDeleteProxy={handleDeleteProxy}
            onCheckProxy={handleCheckProxy}
          />
        )}

        {currentTab === 'extensions' && <ExtensionsView />}

        {currentTab === 'api' && (
          <ApiView profiles={profiles} apiPort={apiPort} />
        )}

        {currentTab === 'settings' && (
          <SettingsView onShowToast={showToast} />
        )}
      </div>

      {/* Modals */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setEditingProfile(null);
        }}
        onSave={handleSaveProfile}
        editingProfile={editingProfile}
        proxies={proxies}
      />

      <ProxyModal
        isOpen={isProxyModalOpen}
        onClose={() => {
          setIsProxyModalOpen(false);
          setEditingProxy(null);
        }}
        onSave={handleSaveProxy}
        editingProxy={editingProxy}
      />

      <CookieModal
        isOpen={isCookieModalOpen}
        onClose={() => {
          setIsCookieModalOpen(false);
          setCookieProfile(null);
        }}
        profile={cookieProfile}
        onCookiesUpdated={loadData}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
