import axios from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ProxyItem, ProxyCheckResult } from '../renderer/types';
import { sanitizeProxy } from '../shared/proxyUtils';

export async function checkProxy(proxy: ProxyItem): Promise<ProxyCheckResult> {
  const clean = sanitizeProxy(proxy);

  if (!clean.host) {
    return { success: false, error: 'Хост прокси не указан' };
  }

  const startTime = Date.now();
  let agent: any = null;

  try {
    let authString = '';
    if (clean.username && clean.password) {
      authString = `${encodeURIComponent(clean.username)}:${encodeURIComponent(clean.password)}@`;
    }

    if (clean.type === 'socks5') {
      const url = `socks5://${authString}${clean.host}:${clean.port}`;
      agent = new SocksProxyAgent(url, { timeout: 12000 });
    } else {
      const proto = clean.type === 'https' ? 'https' : 'http';
      const url = `${proto}://${authString}${clean.host}:${clean.port}`;
      agent = new HttpsProxyAgent(url, { timeout: 12000 });
    }

    // Try primary check service: ip-api.com
    try {
      const response = await axios.get('http://ip-api.com/json', {
        httpAgent: agent,
        httpsAgent: agent,
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0',
        },
      });

      const latency = Date.now() - startTime;
      if (response.data && response.data.query) {
        return {
          success: true,
          latency,
          ip: response.data.query,
          country: response.data.country || response.data.countryCode || 'OK',
        };
      }
    } catch (e1: any) {
      // If 407 Proxy Authentication Required, don't fall back — report directly
      if (e1.response?.status === 407 || e1.message?.includes('407')) {
        return { success: false, error: 'Ошибка авторизации прокси (407 Proxy Auth Required)' };
      }
    }

    // Secondary fallback: api.ipify.org
    try {
      const resp2 = await axios.get('https://api.ipify.org?format=json', {
        httpAgent: agent,
        httpsAgent: agent,
        timeout: 10000,
      });
      const latency = Date.now() - startTime;
      if (resp2.data && resp2.data.ip) {
        return {
          success: true,
          latency,
          ip: resp2.data.ip,
          country: 'Active',
        };
      }
    } catch (e2) {}

    // Tertiary fallback: httpbin.org
    const resp3 = await axios.get('https://httpbin.org/ip', {
      httpAgent: agent,
      httpsAgent: agent,
      timeout: 10000,
    });
    const latency = Date.now() - startTime;
    return {
      success: true,
      latency,
      ip: resp3.data.origin ? resp3.data.origin.split(',')[0].trim() : clean.host,
      country: 'Active',
    };
  } catch (err: any) {
    let errMsg = err.message || 'Ошибка соединения';
    if (err.code === 'ECONNREFUSED') errMsg = 'Подключение отклонено (проверьте хост и порт)';
    else if (err.code === 'ETIMEDOUT' || errMsg.includes('timeout')) errMsg = 'Таймаут соединения (прокси не отвечает)';
    else if (errMsg.includes('407')) errMsg = 'Неверный логин или пароль прокси (407)';
    else if (err.code === 'ENOTFOUND') errMsg = `Хост "${clean.host}" не найден`;

    return {
      success: false,
      error: errMsg,
    };
  }
}
