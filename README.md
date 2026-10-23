# AntyBrowser Portable 🛡️🌐

[![GitHub Release](https://img.shields.io/github/v/release/Sviridov001/AntyBrowser?color=blue&label=%D0%A0%D0%B5%D0%BB%D0%B8%D0%B7)](https://github.com/Sviridov001/AntyBrowser/releases)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%2F11%20x64-blueviolet)](https://github.com/Sviridov001/AntyBrowser)
[![Engines](https://img.shields.io/badge/Engines-Chromium%20%7C%20Firefox-orange)](https://github.com/Sviridov001/AntyBrowser)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**AntyBrowser** — современный полнофункциональный портативный антидетект-браузер для Windows 10/11 x64, созданный в концепции Dolphin Anty. Обеспечивает полную изоляцию цифровых личностей, поддержку двух браузерных движков (**Chromium** и **Mozilla Firefox** с функцией **Mozilla IP Protection VPN**), глубокую подмену цифровых отпечатков (fingerprints), умное управление прокси и локальный REST API для автоматизации через **Playwright** и **Puppeteer**.

Главное преимущество — **100% Portable-архитектура**: приложение запускается с флешки, внешнего накопителя или любой папки без установки, без прав администратора и гарантированно сохраняет все cookies, открытые вкладки, авторизации и сессии при переносе на другой компьютер.

---

## 🚀 Основные возможности

### 1. Поддержка двух браузерных движков: Chromium & Firefox
- **Chromium (Chrome / Edge / Brave):**
  - Поддержка стандартного Chrome, Edge или встроенного портативного Chromium.
  - Полноценная stealth-маскировка через CDP и встроенное ядро расширений.
  - Управление через Chrome DevTools Protocol и Playwright.
- **Mozilla Firefox (Mozilla / Nightly / Developer Edition):**
  - Изолированный запуск через команду `-no-remote -profile ./data/profiles/{id}`.
  - Автоматическая генерация конфигурационного файла `user.js` в директории профиля.
  - Полная поддержка актуальных версий (Firefox 132, 134, 135 и Nightly 150+).

### 2. Встроенный Mozilla IP Protection (VPN)
- В профилях Firefox добавлена нативная поддержка функции **Mozilla IP Protection** (встроенный бесплатный браузерный VPN от Mozilla до 50 ГБ трафика).
- Автоматически прописывает все необходимые флаги в `user.js`:
  ```javascript
  user_pref("browser.ipProtection.enabled", true);
  user_pref("browser.ipProtection.enable", true);
  user_pref("browser.ipProtection.featureGate", true);
  user_pref("browser.ipProtection.ui.enabled", true);
  user_pref("browser.ipProtection.tier", "free");
  ```
- При первом запуске автоматически открывается страница входа в аккаунт Mozilla (`about:preferences#fxa`) и страница проверки IP (`browserleaks.com/ip`).
- На панели инструментов появляется кнопка щита для быстрого включения/выключения VPN.
- Авторизация в аккаунте Mozilla и состояние VPN сохраняются в директории профиля и переносятся между ПК.

### 3. Сохранение и автоматическое восстановление вкладок
- В фоновом режиме каждые 2.5 секунды активные вкладки синхронизируются в файл `./data/profiles/{id}/open_tabs.json`.
- Встроенный фильтр исключает системные и пустые вкладки (`chrome://newtab/`, `about:blank`, расширения и DevTools) и защищает файл от случайного затирания.
- При повторном старте профиля Chromium или Firefox автоматически восстанавливает все открытые сайты в одном окне.
- Вкладки переносятся при клонировании профилей и при создании резервных копий.

### 4. Управление профилями
- Создание, запуск, остановка, редактирование, клонирование и удаление неограниченного количества профилей.
- Индивидуальные папки данных для каждого профиля: изолированные cookies, кэш, история, расширения и локальные хранилища.
- Группировка, цветные теги, мгновенный поиск и фильтрация по статусу (работает / остановлен).
- Визуальные бейджи браузерного движка: `🌐 Chrome`, `🦊 Firefox` и `🛡️ Mozilla VPN`.

### 5. Тонкая настройка цифровых отпечатков (Stealth Fingerprinting)
- **User-Agent:** Пресеты современных версий Chrome и Firefox (Windows, macOS, Linux) и генератор случайного согласованного UA.
- **Canvas:** Детерминированный микро-шум на базе индивидуального seed (уникальный хэш без визуальных артефактов), режим блокировки или реальный.
- **WebGL:** Полная подмена `UNMASKED_VENDOR_WEBGL` и `UNMASKED_RENDERER_WEBGL` (NVIDIA RTX 4070/3070/3060, AMD Radeon RX, Apple M1/M2, Intel Iris Xe) + WebGL readPixels noise.
- **AudioContext:** Защита от снятия аудио-отпечатка методом внесения тонкого шума в аудио-буферы и частотные анализаторы.
- **WebRTC:** Режимы «Через прокси» (исключение утечек локального IP), «Отключить WebRTC» или «Реальный».
- **Разрешение экрана & Окно:** Эмуляция разрешений (1920x1080, 2560x1440, 1440x900, 1366x768 и др.), devicePixelRatio, colorDepth.
- **Аппаратные характеристики:** Эмуляция количества ядер процессора (`hardwareConcurrency`: 2–16) и ОЗУ (`deviceMemory`: 4–32 GB).
- **Часовой пояс & Язык:** Автоматически по прокси или ручной выбор (Europe/Moscow, America/New_York, UTC и др.).
- **Геолокация:** Автоматически по прокси, ручной ввод широты/долготы/точности или блокировка.
- **Чистый stealth-запуск:** Полное сокрытие `navigator.webdriver`, подмена объекта `window.chrome` без использования флагов, вызывающих системные плашки безопасности в интерфейсе.

### 6. Умный Менеджер Прокси и Local Proxy Bridge
- Поддержка протоколов **HTTP**, **HTTPS** и **SOCKS5**.
- **Прозрачный локальный прокси-мост (Local Proxy Bridge):** Встроенный loopback-сервер с автоматической инъекцией `Proxy-Authorization: Basic`. Chromium и Firefox получают доступ через авторизованный прокси без всплывающих окон логина и пароля.
- **Встроенный чекер прокси:** Быстрая проверка соединения, определение реального IP, страны и пинга (latency).
- Поддержка ссылок быстрой ротации IP для мобильных прокси.

### 7. Решение проблемы Windows DPAPI при переносе на другой ПК
В стандартном Chromium куки шифруются через ключ Windows DPAPI текущего пользователя. При переносе папки на другой ПК или смене пользователя куки теряются.
**AntyBrowser решает эту проблему архитектурно:**
- Синхронизатор через CDP/Storage выгружает куки в переносимый формат `./data/profiles/{id}/cookies.json`.
- При запуске на новом ПК куки автоматически восстанавливаются и инжектируются в браузерную сессию.
- Поддерживается ручной и автоматический импорт/экспорт куки в форматах **JSON** и **Netscape** (`cookies.txt`).

### 8. Локальный REST API для автоматизации (Playwright & Puppeteer)
Встроенный HTTP REST-сервер на порту `3001` (настраиваемый):
- `GET /api/v1/status` — статус сервера и список активных процессов.
- `GET /api/v1/profiles` — список всех профилей с их статусом и метаданными.
- `POST /api/v1/profiles/:id/start` — запуск профиля и возврат `wsEndpoint` для прямого подключения Playwright.
- `POST /api/v1/profiles/:id/stop` — корректная остановка профиля с фиксацией куки и вкладок.
- `GET /api/v1/profiles/:id/cookies` — экспорт куки.
- `POST /api/v1/profiles/:id/cookies` — импорт куки.

#### Пример автоматизации на JavaScript / TypeScript (Node.js):
```javascript
const { chromium } = require('playwright');
const axios = require('axios');

async function run() {
  const profileId = 'YOUR_PROFILE_ID';
  
  // 1. Запуск профиля через локальный API AntyBrowser
  const res = await axios.post(`http://127.0.0.1:3001/api/v1/profiles/${profileId}/start`);
  const { wsEndpoint } = res.data;

  // 2. Подключение Playwright к сессии браузера
  const browser = await chromium.connectOverCDP(wsEndpoint);
  const context = browser.contexts()[0];
  const page = await context.newPage();

  // 3. Выполнение действий
  await page.goto('https://browserleaks.com/canvas');
  console.log('Title:', await page.title());

  // 4. Остановка профиля
  // await axios.post(`http://127.0.0.1:3001/api/v1/profiles/${profileId}/stop`);
}
run();
```

#### Пример автоматизации на Python:
```python
import asyncio
import requests
from playwright.async_api import async_playwright

async def main():
    profile_id = 'YOUR_PROFILE_ID'
    res = requests.post(f"http://127.0.0.1:3001/api/v1/profiles/{profile_id}/start")
    ws_endpoint = res.json()['wsEndpoint']

    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp(ws_endpoint)
        context = browser.contexts[0]
        page = await context.new_page()
        await page.goto('https://browserleaks.com/canvas')
        print(await page.title())

asyncio.run(main())
```

### 9. Резервное копирование и Восстановление
- Создание снимков базы данных SQLite, файлов куки и открытых вкладок в папку `./data/backups/`.
- Восстановление любых данных в один клик из интерфейса.

---

## 📁 Структура каталога (100% Portable)

```text
AntyBrowser/
├── AntyBrowser.exe            # Автономный исполняемый файл приложения
├── data/                      # ВСЕ постоянные данные приложения
│   ├── database.sqlite        # База данных SQLite (профили, прокси, настройки)
│   ├── profiles/              # Директории профилей
│   │   └── {profile_id}/
│   │       ├── cookies.json   # Переносимые куки профиля
│   │       ├── open_tabs.json # Сохранённые вкладки предыдущей сессии
│   │       ├── user.js        # Конфигурация для профилей Firefox (VPN, прокси)
│   │       └── ...            # Изолированный кэш и данные браузера
│   ├── extensions/            # Пользовательские расширения Chromium
│   ├── backups/               # Резервные копии базы и профилей
│   ├── electron_user_data/    # Изолированные данные оболочки Electron
│   └── temp/                  # Временные файлы
└── bin/                       # Опциональные локальные браузеры (если не используются системные)
    ├── chromium/              # Портативный Chrome/Chromium
    └── firefox/               # Портативный Firefox / Nightly
```

---

## 🛠️ Сборка из исходного кода

### Требования
- Node.js 18+ (протестировано на Node.js v24 x64)
- Windows 10/11 x64
- Git

### Команды
```bash
# 1. Клонирование репозитория
git clone https://github.com/Sviridov001/AntyBrowser.git
cd AntyBrowser

# 2. Установка зависимостей
npm install

# 3. Сборка фронтенда (React + Vite) и бэкенда (TypeScript)
npm run build

# 4. Запуск в режиме разработки
npm start

# 5. Запуск всех автоматизированных тестов
npm test

# 6. Сборка готового переносимого EXE для Windows x64
npm run pack:portable
```
Готовый исполняемый файл будет помещён в `dist-release/AntyBrowser.exe`.

---

## 🧪 Автоматизированные тесты

В проект включено **6 наборов автоматизированных тестов**:

1. **`tests/persistence.test.ts` (Сохранение данных):**  
   Проверяет создание независимых профилей, сохранение настроек, паролей прокси, экспорт и импорт куки в форматах JSON и Netscape, целостность базы данных SQLite в каталоге `./data/`.
2. **`tests/portability.test.ts` (Перенос между компьютерами):**  
   Моделирует копирование всей папки приложения на другой компьютер (новый путь, другой пользователь Windows), старт приложения и валидацию доступности профилей, отпечатков и сессионных куки без привязки к абсолютным путям.
3. **`tests/proxy.test.ts` (Парсинг и валидация прокси):**  
   Проверяет разбор форматов `ip:port`, `ip:port:user:pass`, URL-синтаксиса (`socks5://...`, `http://...`) и очистку хостов.
4. **`tests/bridge.test.ts` (Локальный прокси-мост):**  
   Проверяет работу loopback-моста с автоматической инъекцией заголовка `Proxy-Authorization: Basic`, исключающего окна запроса пароля в браузере.
5. **`tests/tabs.test.ts` (Сохранение и восстановление вкладок):**  
   Проверяет фильтрацию URL, сохранение сессий в `open_tabs.json`, защиту от стирания пустыми вкладками и передачу аргументов запуска в браузер.
6. **`tests/firefox.test.ts` (Firefox & Mozilla IP Protection VPN):**  
   Проверяет генерацию файла `user.js`, активацию флагов `browser.ipProtection.enable`, настройку прокси, подмену user-agent и сохранение параметров профилей Firefox в базе данных.

Запуск тестов:
```bash
npm test
```

---

## ✅ Критерии приёмки

1. **Распаковка на ПК №1:** Запустить `AntyBrowser.exe`.
2. **Создание профилей:**
   - Создать профиль Chromium, настроить отпечатки и прокси, авторизоваться на сайтах.
   - Создать профиль Firefox, активировать **Mozilla IP Protection (VPN)**.
3. **Проверка работы:**
   - В профиле Chromium убедиться в отсутствии всплывающих окон логина прокси и отсутствии плашек командной строки.
   - В профиле Firefox войти в аккаунт Mozilla и включить тумблер VPN через иконку щита на панели инструментов.
   - Открыть несколько вкладок и закрыть браузеры.
4. **Перенос на ПК №2:** Скопировать папку `AntyBrowser` на флешку или другой компьютер и запустить `AntyBrowser.exe`.
5. **Результат:** Все профили, настройки, cookies, авторизации в аккаунтах и открытые вкладки сохраняются без повторного ввода и без системных зависимостей.
