/**
 * curlFetch - curl-backed HTTP client for environments where the corporate proxy
 * requires Kerberos/NTLM authentication that undici cannot handle natively.
 * curl uses the macOS system credential store transparently.
 */

import { execFile } from 'child_process';

interface CurlFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export interface CurlFetchResponse {
  ok: boolean;
  status: number;
  text(): string;
  json(): any;
}

const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

export function curlFetch(url: string, options: CurlFetchOptions = {}): Promise<CurlFetchResponse> {
  return new Promise((resolve, reject) => {
    const { method = 'GET', headers = {}, body, timeoutMs = 60000 } = options;

    const args: string[] = [
      '--silent',
      '--show-error',
      '--location',                    // follow redirects
      '--write-out', '\n__STATUS__%{http_code}',
      '--max-time', String(Math.floor(timeoutMs / 1000)),
    ];

    // Proxy
    if (PROXY) {
      args.push('--proxy', PROXY);
      args.push('--proxy-anyauth');   // let curl pick the best auth method (NTLM, Negotiate, Basic…)
      args.push('--proxy-negotiate'); // Kerberos Negotiate
      args.push('--proxy-ntlm');      // NTLM fallback
    }

    // Method
    args.push('-X', method);

    // Headers
    for (const [k, v] of Object.entries(headers)) {
      args.push('-H', `${k}: ${v}`);
    }

    // Body
    if (body) {
      args.push('--data-raw', body);
    }

    args.push(url);

    execFile('curl', args, { maxBuffer: 20 * 1024 * 1024, timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err && !stdout) {
        return reject(new Error(`curl error: ${err.message}${stderr ? ` — ${stderr.trim()}` : ''}`));
      }

      // Parse status code appended by --write-out
      const marker = '\n__STATUS__';
      const markerIdx = stdout.lastIndexOf(marker);
      let responseBody = stdout;
      let status = 0;

      if (markerIdx !== -1) {
        responseBody = stdout.slice(0, markerIdx);
        status = parseInt(stdout.slice(markerIdx + marker.length), 10);
      }

      resolve({
        ok: status >= 200 && status < 300,
        status,
        text: () => responseBody,
        json: () => JSON.parse(responseBody),
      });
    });
  });
}
