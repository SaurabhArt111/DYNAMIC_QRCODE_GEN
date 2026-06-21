import { networkInterfaces } from 'os';
import { URL } from 'url';

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function getLocalIPv4Addresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((item) => item && item.family === 'IPv4' && !item.internal)
    .map((item) => item.address);
}

export function getAllowedClientOrigins(clientUrl) {
  const configured = parseUrl(clientUrl);
  const port = configured?.port || '5173';
  const origins = new Set([
    clientUrl,
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`
  ]);

  for (const address of getLocalIPv4Addresses()) {
    origins.add(`http://${address}:${port}`);
  }

  return origins;
}

export function resolveClientRedirectUrl(req, fallbackClientUrl) {
  const configured = parseUrl(fallbackClientUrl);
  const clientPort = configured?.port || '5173';
  const host = req.hostname;

  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:${clientPort}`;
  }

  return fallbackClientUrl;
}
