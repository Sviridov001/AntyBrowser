export type OS = 'windows' | 'macos' | 'linux';

export type CanvasMode = 'noise' | 'real' | 'block';
export type WebGLMode = 'noise' | 'real' | 'block';
export type AudioMode = 'noise' | 'real';
export type WebRTCMode = 'proxy' | 'disable' | 'real';
export type TimezoneMode = 'auto' | 'manual';
export type GeolocationMode = 'auto' | 'manual' | 'block';

export interface Profile {
  id: string;
  name: string;
  group_name: string;
  tags: string[];
  os: OS;
  browser_type: string;
  proxy_id: string | null;
  user_agent: string;
  screen_width: number;
  screen_height: number;
  screen_color_depth: number;
  device_pixel_ratio: number;
  canvas_mode: CanvasMode;
  canvas_noise_seed: number;
  webgl_mode: WebGLMode;
  webgl_vendor: string;
  webgl_renderer: string;
  audio_mode: AudioMode;
  audio_noise_seed: number;
  webrtc_mode: WebRTCMode;
  webrtc_public_ip: string | null;
  timezone_mode: TimezoneMode;
  timezone_id: string;
  geolocation_mode: GeolocationMode;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  language: string;
  cpu_cores: number;
  memory_gb: number;
  notes: string;
  custom_flags: string;
  created_at: string;
  updated_at: string;
  // Runtime status
  status?: 'running' | 'stopped';
  cdp_port?: number;
  ws_endpoint?: string;
}

export type ProxyType = 'http' | 'https' | 'socks5';
export type ProxyStatus = 'active' | 'inactive' | 'error' | 'untested';

export interface ProxyItem {
  id: string;
  name: string;
  type: ProxyType;
  host: string;
  port: number;
  username: string | null;
  password: string | null;
  change_url: string | null;
  status: ProxyStatus;
  last_checked: string | null;
  latency: number | null;
  external_ip: string | null;
  country: string | null;
  created_at: string;
}

export interface ExtensionItem {
  id: string;
  name: string;
  version: string;
  path: string;
  enabled: boolean;
  created_at: string;
}

export interface AppSettings {
  chromium_path: string;
  api_port: number;
  api_enabled: boolean;
  theme: string;
  language: string;
  auto_backup: boolean;
}

export interface CookieItem {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface ProxyCheckResult {
  success: boolean;
  latency?: number;
  ip?: string;
  country?: string;
  error?: string;
}
