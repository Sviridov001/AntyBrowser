import path from 'path';
import fs from 'fs';
import { Profile } from '../renderer/types';
import { USER_AGENT_PRESETS, WEBGL_PRESETS, SCREEN_RESOLUTIONS } from '../shared/presets';

export { USER_AGENT_PRESETS, WEBGL_PRESETS, SCREEN_RESOLUTIONS };

export function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRandomFingerprint(os: 'windows' | 'macos' | 'linux' = 'windows'): Partial<Profile> {
  const uaList = USER_AGENT_PRESETS[os] || USER_AGENT_PRESETS.windows;
  const webgl = getRandomElement(WEBGL_PRESETS);
  const screen = getRandomElement(SCREEN_RESOLUTIONS);
  const cores = getRandomElement([4, 6, 8, 12, 16]);
  const memory = getRandomElement([8, 16, 32]);
  const canvasSeed = Math.floor(Math.random() * 1000000) + 1;
  const audioSeed = Math.floor(Math.random() * 1000000) + 1;

  return {
    os,
    user_agent: getRandomElement(uaList),
    screen_width: screen.width,
    screen_height: screen.height,
    screen_color_depth: 24,
    device_pixel_ratio: screen.width > 2000 ? 1.25 : 1.0,
    canvas_mode: 'noise',
    canvas_noise_seed: canvasSeed,
    webgl_mode: 'noise',
    webgl_vendor: webgl.vendor,
    webgl_renderer: webgl.renderer,
    audio_mode: 'noise',
    audio_noise_seed: audioSeed,
    webrtc_mode: 'proxy',
    cpu_cores: cores,
    memory_gb: memory,
    language: 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    timezone_mode: 'auto',
    timezone_id: 'Europe/Moscow',
    geolocation_mode: 'auto',
  };
}

/**
 * Builds the stealth script injected into every window and iframe via Page.addScriptToEvaluateOnNewDocument
 */
export function buildStealthInjectionScript(profile: Profile): string {
  const config = {
    canvasMode: profile.canvas_mode,
    canvasSeed: profile.canvas_noise_seed || 12345,
    webglMode: profile.webgl_mode,
    webglVendor: profile.webgl_vendor || 'Google Inc. (NVIDIA)',
    webglRenderer: profile.webgl_renderer || 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    audioMode: profile.audio_mode,
    audioSeed: profile.audio_noise_seed || 54321,
    webrtcMode: profile.webrtc_mode,
    screenWidth: profile.screen_width || 1920,
    screenHeight: profile.screen_height || 1080,
    colorDepth: profile.screen_color_depth || 24,
    devicePixelRatio: profile.device_pixel_ratio || 1.0,
    cpuCores: profile.cpu_cores || 8,
    memoryGb: profile.memory_gb || 16,
    os: profile.os || 'windows',
    language: profile.language || 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    userAgent: profile.user_agent,
  };

  return `
    (() => {
      'use strict';
      const CFG = ${JSON.stringify(config)};

      // 1. Remove navigator.webdriver & set modern chrome props
      try {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
          configurable: true,
        });
        delete (Object.getPrototypeOf(navigator) || navigator).webdriver;
      } catch (e) {}

      // Chrome runtime object
      if (!window.chrome) {
        window.chrome = {};
      }
      if (!window.chrome.runtime) {
        window.chrome.runtime = {
          PlatformOs: { MAC: 'mac', WIN: 'win', ANDROID: 'android', CROS: 'cros', LINUX: 'linux', OPENBSD: 'openbsd' },
          PlatformArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64' },
          PlatformNaclArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64' },
          RequestUpdateCheckStatus: { THROTTLED: 'throttled', NO_UPDATE: 'no_update', UPDATE_AVAILABLE: 'update_available' },
          OnInstalledReason: { INSTALL: 'install', UPDATE: 'update', CHROME_UPDATE: 'chrome_update', SHARED_MODULE_UPDATE: 'shared_module_update' },
          OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
        };
      }

      // 2. Hardware specs
      try {
        Object.defineProperty(navigator, 'hardwareConcurrency', {
          get: () => CFG.cpuCores,
          configurable: true,
        });
        Object.defineProperty(navigator, 'deviceMemory', {
          get: () => CFG.memoryGb,
          configurable: true,
        });
        const platformStr = CFG.os === 'macos' ? 'MacIntel' : (CFG.os === 'linux' ? 'Linux x86_64' : 'Win32');
        Object.defineProperty(navigator, 'platform', {
          get: () => platformStr,
          configurable: true,
        });
        const langs = CFG.language.split(',').map(s => s.split(';')[0].trim()).filter(Boolean);
        Object.defineProperty(navigator, 'languages', {
          get: () => langs.length ? langs : ['ru-RU', 'ru', 'en-US', 'en'],
          configurable: true,
        });
        Object.defineProperty(navigator, 'language', {
          get: () => langs[0] || 'ru-RU',
          configurable: true,
        });
      } catch (e) {}

      // 3. Screen overrides
      try {
        Object.defineProperty(screen, 'width', { get: () => CFG.screenWidth, configurable: true });
        Object.defineProperty(screen, 'height', { get: () => CFG.screenHeight, configurable: true });
        Object.defineProperty(screen, 'availWidth', { get: () => CFG.screenWidth, configurable: true });
        Object.defineProperty(screen, 'availHeight', { get: () => CFG.screenHeight - 40, configurable: true });
        Object.defineProperty(screen, 'colorDepth', { get: () => CFG.colorDepth, configurable: true });
        Object.defineProperty(screen, 'pixelDepth', { get: () => CFG.colorDepth, configurable: true });
        Object.defineProperty(window, 'devicePixelRatio', { get: () => CFG.devicePixelRatio, configurable: true });
      } catch (e) {}

      // 4. Canvas Fingerprint Noise
      if (CFG.canvasMode === 'noise') {
        const seed = CFG.canvasSeed || 12345;
        function getNoise(x, y, channel) {
          const pseudo = Math.sin(x * 12.9898 + y * 78.233 + channel * 37.719 + seed) * 43758.5453;
          return (pseudo - Math.floor(pseudo)) * 2 - 1; // -1 to 1
        }

        const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        CanvasRenderingContext2D.prototype.getImageData = function(x, y, w, h) {
          const imgData = origGetImageData.apply(this, arguments);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const px = (i / 4) % w;
            const py = Math.floor((i / 4) / w);
            // apply subtle noise only on color channels
            const nR = Math.round(getNoise(px, py, 1) * 2);
            const nG = Math.round(getNoise(px, py, 2) * 2);
            const nB = Math.round(getNoise(px, py, 3) * 2);
            data[i] = Math.min(255, Math.max(0, data[i] + nR));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + nG));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + nB));
          }
          return imgData;
        };

        const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function() {
          try {
            const ctx = this.getContext('2d');
            if (ctx && this.width > 0 && this.height > 0) {
              const imgData = ctx.getImageData(0, 0, Math.min(this.width, 16), Math.min(this.height, 16));
              ctx.putImageData(imgData, 0, 0);
            }
          } catch (e) {}
          return origToDataURL.apply(this, arguments);
        };

        const origToBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
          try {
            const ctx = this.getContext('2d');
            if (ctx && this.width > 0 && this.height > 0) {
              const imgData = ctx.getImageData(0, 0, Math.min(this.width, 16), Math.min(this.height, 16));
              ctx.putImageData(imgData, 0, 0);
            }
          } catch (e) {}
          return origToBlob.apply(this, arguments);
        };
      } else if (CFG.canvasMode === 'block') {
        CanvasRenderingContext2D.prototype.getImageData = function() {
          return new ImageData(1, 1);
        };
      }

      // 5. WebGL Vendor & Renderer Spoofing + Noise
      const spoofWebGL = (proto) => {
        if (!proto) return;
        const origGetParameter = proto.getParameter;
        proto.getParameter = function(param) {
          // UNMASKED_VENDOR_WEBGL = 0x9245 (37445)
          if (param === 37445) {
            return CFG.webglVendor;
          }
          // UNMASKED_RENDERER_WEBGL = 0x9246 (37446)
          if (param === 37446) {
            return CFG.webglRenderer;
          }
          return origGetParameter.apply(this, arguments);
        };

        if (CFG.webglMode === 'noise') {
          const origReadPixels = proto.readPixels;
          proto.readPixels = function(x, y, w, h, format, type, pixels) {
            origReadPixels.apply(this, arguments);
            if (pixels && pixels.length) {
              const seed = CFG.canvasSeed || 12345;
              for (let i = 0; i < Math.min(pixels.length, 100); i += 4) {
                pixels[i] = (pixels[i] + (seed % 3)) % 256;
              }
            }
          };
        }
      };
      try {
        if (window.WebGLRenderingContext) spoofWebGL(window.WebGLRenderingContext.prototype);
        if (window.WebGL2RenderingContext) spoofWebGL(window.WebGL2RenderingContext.prototype);
      } catch (e) {}

      // 6. AudioContext Fingerprint Noise
      if (CFG.audioMode === 'noise' && window.AudioBuffer) {
        const audioSeed = CFG.audioSeed || 54321;
        const origGetChannelData = AudioBuffer.prototype.getChannelData;
        AudioBuffer.prototype.getChannelData = function(channel) {
          const data = origGetChannelData.apply(this, arguments);
          const noiseFactor = 0.000001 * (audioSeed % 10);
          for (let i = 0; i < data.length; i += 100) {
            data[i] = data[i] + noiseFactor;
          }
          return data;
        };

        if (window.AnalyserNode) {
          const origGetFloatFreq = AnalyserNode.prototype.getFloatFrequencyData;
          AnalyserNode.prototype.getFloatFrequencyData = function(array) {
            origGetFloatFreq.apply(this, arguments);
            for (let i = 0; i < array.length; i += 20) {
              array[i] += 0.001 * ((audioSeed + i) % 5);
            }
          };
        }
      }

      // 7. WebRTC Protection
      if (CFG.webrtcMode === 'disable') {
        window.RTCPeerConnection = undefined;
        window.webkitRTCPeerConnection = undefined;
        window.RTCSessionDescription = undefined;
        window.RTCIceCandidate = undefined;
      }

      // 8. Permissions query mock
      if (navigator.permissions && navigator.permissions.query) {
        const origQuery = navigator.permissions.query;
        navigator.permissions.query = function(params) {
          if (params && params.name === 'notifications') {
            return Promise.resolve({ state: Notification.permission, onchange: null });
          }
          return origQuery.apply(this, arguments);
        };
      }
    })();
  `;
}

/**
 * Creates the unpacked extension inside profile directory for proxy authentication and content-level stealth
 */
export function createProfileStealthExtension(
  extensionDir: string,
  proxyAuth?: { username: string; password: string }
): void {
  if (!fs.existsSync(extensionDir)) {
    fs.mkdirSync(extensionDir, { recursive: true });
  }

  const manifest = {
    manifest_version: 2,
    name: 'Anty Stealth Core',
    version: '1.0.0',
    description: 'AntyBrowser Core Stealth & Proxy Auth Module',
    permissions: [
      'webRequest',
      'webRequestBlocking',
      '<all_urls>',
      'proxy',
      'storage',
    ],
    background: {
      scripts: ['background.js'],
      persistent: true,
    },
    content_scripts: [
      {
        matches: ['<all_urls>'],
        js: ['content.js'],
        run_at: 'document_start',
        all_frames: true,
      },
    ],
  };

  fs.writeFileSync(path.join(extensionDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  let backgroundJs = `// AntyBrowser Background Worker\n`;
  if (proxyAuth && proxyAuth.username && proxyAuth.password) {
    backgroundJs += `
chrome.webRequest.onAuthRequired.addListener(
  function(details) {
    return {
      authCredentials: {
        username: ${JSON.stringify(proxyAuth.username)},
        password: ${JSON.stringify(proxyAuth.password)}
      }
    };
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);
console.log("[AntyBrowser] Proxy authentication handler registered.");
`;
  } else {
    backgroundJs += `console.log("[AntyBrowser] Stealth extension initialized (no proxy auth needed).");\n`;
  }

  fs.writeFileSync(path.join(extensionDir, 'background.js'), backgroundJs);

  const contentJs = `
// AntyBrowser content script stealth injection fallback
try {
  const script = document.createElement('script');
  script.textContent = "Object.defineProperty(navigator, 'webdriver', { get: () => undefined });";
  (document.head || document.documentElement).appendChild(script);
  script.remove();
} catch (e) {}
`;
  fs.writeFileSync(path.join(extensionDir, 'content.js'), contentJs);
}
