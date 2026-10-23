# AntyBrowser Portable

**AntyBrowser** — полноценный портативный антидетект-браузер для Windows 10/11 x64, созданный по аналогии с Dolphin Anty. Программа обеспечивает изоляцию цифровых личностей, управление независимыми браузерными профилями, тонкую настройку цифровых отпечатков (fingerprints), поддержку прокси и локальный REST API для автоматизации через **Playwright**.

Главное преимущество — **100% Portable-архитектура**: приложение запускается с флешки, внешнего накопителя или любой папки без установки, без прав администратора и сохраняет все cookies, авторизации и сессии при переносе на другой компьютер.

---

## 🚀 Основные возможности

### 1. Управление профилями
- Создание, редактирование, клонирование и удаление неограниченного количества профилей.
- Индивидуальные папки данных для каждого профиля: изолированные cookies, кэш, история, локальное хранилище и расширения.
- Группировка, теги, поиск в реальном времени и сортировка по статусу (работает / остановлен).
- Одновременный запуск любого количества независимых профилей.

### 2. Подмена цифрового отпечатка (Stealth Fingerprinting)
- **User-Agent:** Пресеты современных версий Chrome (Windows, macOS, Linux) и генератор случайного согласованного UA.
- **Canvas:** Детерминированный микро-шум на базе уникального seed для каждого профиля (уникальный хэш без визуальных артефактов), режим блокировки или реальный.
- **WebGL:** Полная подмена `UNMASKED_VENDOR_WEBGL` и `UNMASKED_RENDERER_WEBGL` (NVIDIA RTX 4070/3070, AMD Radeon, Apple M1/M2, Intel Iris Xe) + WebGL readPixels noise.
- **AudioContext:** Защита от снятия аудио-отпечатка методом внесения шума в аудио-буферы и частотные анализаторы.
- **WebRTC:** Режимы «Через прокси» (исключение утечек локального IP), «Отключить WebRTC» или «Реальный».
- **Разрешение экрана & Окно:** Эмуляция разрешений (1920x1080, 2560x1440, 1440x900, 1366x768 и др.), devicePixelRatio, colorDepth.
- **Аппаратные характеристики:** Эмуляция ядер процессора (`hardwareConcurrency`: 2–16) и ОЗУ (`deviceMemory`: 4–32 GB).
- **Часовой пояс & Язык:** Автоматически по IP или ручной выбор (Europe/Moscow, America/New_York, UTC и др.).
- **Геолокация:** Автоматически по прокси, ручной ввод широты/долготы или блокировка.
- **Скрытие автоматизации:** Удаление флага `navigator.webdriver`, подмена объекта `window.chrome`, маскировка runtime-артефактов.

### 3. Менеджер Прокси
- Поддержка протоколов **HTTP**, **HTTPS** и **SOCKS5**.
- Автоматическая авторизация по логину и паролю без системных диалоговых окон через изолированное расширение с `chrome.webRequest.onAuthRequired`.
- Встроенный тестер прокси: определение реального исходящего IP-адреса, страны и пинга (latency).
- Поддержка ссылок для моментальной ротации IP мобильных прокси.

### 4. Решение проблемы Windows DPAPI при переносе на другой ПК
В стандартном Chromium куки шифруются через Windows DPAPI (ключ текущего пользователя Windows). При копировании папки Chromium на другой ПК сессии и куки сбрасываются.
**AntyBrowser решает эту проблему на уровне архитектуры:**
- Встроенный двухсторонний синхронизатор через Chrome DevTools Protocol (CDP) выгружает куки в портативный формат `./data/profiles/{id}/cookies.json`.
- При запуске на новом компьютере куки автоматически восстанавливаются и инжектируются в браузерную сессию через CDP `Network.setCookies`.
- Поддерживается ручной и автоматический импорт/экспорт куки в форматах **JSON** и **Netscape** (`cookies.txt`).

### 5. Локальный API для Playwright и Puppeteer
Встроенный HTTP REST-сервер на порту `3001` (настраиваемый):
- `GET /api/v1/status` — статус сервера и активных профилей.
- `GET /api/v1/profiles` — список всех профилей с их статусом.
- `POST /api/v1/profiles/:id/start` — запуск профиля и возврат `wsEndpoint` для подключения Playwright.
- `POST /api/v1/profiles/:id/stop` — остановка профиля с сохранением куки.
- `GET /api/v1/profiles/:id/cookies` — экспорт куки.
- `POST /api/v1/profiles/:id/cookies` — импорт куки.

#### Пример автоматизации на JavaScript (Node.js):
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

### 6. Резервное копирование и Восстановление
- Создание изолированных снимков базы данных и куки профилей в папку `./data/backups/`.
- Восстановление любых данных в один клик из интерфейса.

---

## 📁 Структура каталога (100% Portable)

```
AntyBrowser/
├── AntyBrowser.exe            # Автономный исполняемый файл
├── data/                      # ВСЕ постоянные данные приложения
│   ├── database.sqlite        # Локальная база SQLite (профили, прокси, настройки)
│   ├── profiles/              # Папки профилей с cookies.json и кэшем
│   ├── extensions/            # Пользовательские расширения Chromium
│   ├── backups/               # Резервные копии базы и профилей
│   ├── electron_user_data/    # Изолированные данные оболочки Electron
│   └── temp/                  # Временные файлы
└── bin/
    └── chromium/              # Опциональный портативный Chromium (если не используется системный)
```

---

## 🛠️ Сборка из исходного кода

### Требования
- Node.js 18+ (протестировано на Node.js v24 x64)
- Windows 10/11 x64

### Команды
```bash
# 1. Установка зависимостей
npm install

# 2. Сборка фронтенда (React + Vite) и бэкенда (TypeScript)
npm run build

# 3. Запуск в режиме разработки
npm start

# 4. Сборка Portable EXE для Windows
npm run pack:portable
```
Готовый исполняемый файл будет помещён в `dist-release/AntyBrowser.exe`.

---

## 🧪 Автоматизированные тесты

В проект включены тесты, подтверждающие выполнение всех критериев ТЗ:
1. **Тест персистентности данных (`tests/persistence.test.ts`):** проверяет создание нескольких профилей с разными отпечатками, сохранение прокси с паролями, импорт/экспорт куки в форматах JSON и Netscape, целостность базы данных SQLite в папке `./data/`.
2. **Тест переноса между ПК (`tests/portability.test.ts`):** моделирует перенос всей папки приложения на другой компьютер (новый путь, симуляция внешнего диска / другого пользователя Windows), запуск приложения в новой среде и проверку доступности всех профилей, настроек и сессионных куки без DPAPI-блокировок.

Запуск тестов:
```bash
npm test
```

---

## ✅ Критерии приёмки

1. **Распаковка на ПК №1:** Запустить `AntyBrowser.exe`.
2. **Создание профилей:** Создать несколько профилей с различными отпечатками (Canvas, WebGL, аудио, разрешение), настроить прокси, вставить или получить cookies на тестовых сайтах.
3. **Закрытие:** Закрыть приложение. Все cookies автоматически синхронизируются в `./data/profiles/{id}/cookies.json`.
4. **Перенос на ПК №2:** Скопировать папку на другой компьютер или внешний диск и запустить `AntyBrowser.exe`.
5. **Результат:** Все профили, настройки, прокси и авторизационные cookies остаются активными и загружаются без ошибок и без системных зависимостей.
