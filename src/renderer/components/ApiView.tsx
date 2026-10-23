import React, { useState } from 'react';
import { Terminal, Copy, Check, ExternalLink, Code2 } from 'lucide-react';
import { Profile } from '../types';

interface ApiViewProps {
  profiles: Profile[];
  apiPort?: number;
}

export const ApiView: React.FC<ApiViewProps> = ({ profiles, apiPort = 3001 }) => {
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    profiles.length > 0 ? profiles[0].id : ''
  );
  const [language, setLanguage] = useState<'js' | 'python'>('js');
  const [copied, setCopied] = useState(false);

  const sampleProfileId = selectedProfileId || 'your-profile-id';

  const jsCode = `// Автоматизация Playwright через локальный API AntyBrowser
const { chromium } = require('playwright');
const axios = require('axios');

async function run() {
  const PROFILE_ID = '${sampleProfileId}';
  const API_URL = 'http://127.0.0.1:${apiPort}/api/v1';

  // 1. Запуск профиля через локальный REST API
  console.log('Запуск профиля...');
  const startResp = await axios.post(\`\${API_URL}/profiles/\${PROFILE_ID}/start\`);
  const { wsEndpoint } = startResp.data;
  console.log('CDP WebSocket URL:', wsEndpoint);

  // 2. Подключение Playwright к запущенному браузеру
  const browser = await chromium.connectOverCDP(wsEndpoint);
  const context = browser.contexts()[0];
  const page = await context.newPage();

  // 3. Переход на страницу и автоматизация
  await page.goto('https://browserleaks.com/canvas');
  console.log('Заголовок страницы:', await page.title());

  // Делаем скриншот для проверки отпечатка
  await page.screenshot({ path: 'canvas_fingerprint.png' });

  // 4. Остановка профиля (с сохранением куки)
  // await axios.post(\`\${API_URL}/profiles/\${PROFILE_ID}/stop\`);
}

run().catch(console.error);`;

  const pythonCode = `# Автоматизация Playwright на Python через API AntyBrowser
import asyncio
import requests
from playwright.async_api import async_playwright

async def main():
    profile_id = '${sampleProfileId}'
    api_url = 'http://127.0.0.1:${apiPort}/api/v1'

    # 1. Запуск профиля через локальный API
    response = requests.post(f"{api_url}/profiles/{profile_id}/start")
    data = response.json()
    ws_endpoint = data['wsEndpoint']
    print(f"CDP подключение: {ws_endpoint}")

    # 2. Подключение Playwright
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp(ws_endpoint)
        context = browser.contexts[0]
        page = await context.new_page()

        await page.goto('https://browserleaks.com/canvas')
        print("Title:", await page.title())
        await page.screenshot(path='canvas.png')

asyncio.run(main())`;

  const activeCode = language === 'js' ? jsCode : pythonCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Terminal className="text-blue-400" size={20} />
          <span>Локальный REST API & Playwright Автоматизация</span>
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Управляйте профилями программно из ваших скриптов на Node.js или Python через CDP (Chrome DevTools Protocol).
        </p>
      </div>

      {/* API Endpoints Card */}
      <div className="anty-card p-5 space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider text-gray-400">
          Доступные Endpoints (Base URL: http://127.0.0.1:{apiPort}/api/v1)
        </h4>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-[#1b253d] p-3 rounded-lg border border-[#24304f] space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded text-[10px]">
                POST
              </span>
              <span className="font-mono text-white">/profiles/:id/start</span>
            </div>
            <p className="text-[11px] text-gray-400">
              Запускает профиль и возвращает <code className="text-blue-400 font-mono">wsEndpoint</code> для Playwright.
            </p>
          </div>

          <div className="bg-[#1b253d] p-3 rounded-lg border border-[#24304f] space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded text-[10px]">
                POST
              </span>
              <span className="font-mono text-white">/profiles/:id/stop</span>
            </div>
            <p className="text-[11px] text-gray-400">
              Останавливает профиль и сохраняет все cookies в файл.
            </p>
          </div>

          <div className="bg-[#1b253d] p-3 rounded-lg border border-[#24304f] space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded text-[10px]">
                GET
              </span>
              <span className="font-mono text-white">/profiles</span>
            </div>
            <p className="text-[11px] text-gray-400">
              Возвращает список всех профилей и их статус (running/stopped).
            </p>
          </div>

          <div className="bg-[#1b253d] p-3 rounded-lg border border-[#24304f] space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded text-[10px]">
                GET
              </span>
              <span className="font-mono text-white">/profiles/:id/cookies</span>
            </div>
            <p className="text-[11px] text-gray-400">
              Экспорт cookies в формате JSON или Netscape (?format=netscape).
            </p>
          </div>
        </div>
      </div>

      {/* Code Generator & Snippets */}
      <div className="anty-card p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Code2 size={18} className="text-blue-400" />
            <span className="text-xs font-semibold text-white">Пример скрипта автоматизации:</span>
            {profiles.length > 0 && (
              <select
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="anty-input text-xs py-1"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id.slice(0, 8)})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-[#151d30] p-1 rounded-md border border-[#24304f] flex">
              <button
                onClick={() => setLanguage('js')}
                className={`text-xs px-3 py-1 rounded font-medium ${
                  language === 'js' ? 'bg-blue-600 text-white' : 'text-gray-400'
                }`}
              >
                JavaScript / TS
              </button>
              <button
                onClick={() => setLanguage('python')}
                className={`text-xs px-3 py-1 rounded font-medium ${
                  language === 'python' ? 'bg-blue-600 text-white' : 'text-gray-400'
                }`}
              >
                Python
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="anty-btn-primary text-xs px-3 py-1.5"
            >
              {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
              <span>{copied ? 'Скопировано!' : 'Копировать код'}</span>
            </button>
          </div>
        </div>

        <pre className="bg-[#0b0f19] p-4 rounded-lg border border-[#1f2937] text-xs text-blue-200 overflow-x-auto leading-relaxed">
          <code>{activeCode}</code>
        </pre>
      </div>
    </div>
  );
};
