export function normalizeLocalServerUrl(value: string, allowLoopback = false): string {
  try {
    const raw = value.trim();
    const url = new URL(raw.includes('://') ? raw : `http://${raw}`);
    const host = url.hostname;
    const parts = host.split('.');
    const ipv4 =
      parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
    const privateIP =
      ipv4 &&
      (parts[0] === '10' ||
        (parts[0] === '192' && parts[1] === '168') ||
        (parts[0] === '172' && Number(parts[1]) >= 16 && Number(parts[1]) <= 31));
    const loopback = allowLoopback && ['localhost', '127.0.0.1'].includes(host);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      (!privateIP && !loopback) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/'
    )
      throw new Error();
    if (!url.port) url.port = '8787';
    if (Number(url.port) < 1) throw new Error();
    return url.origin;
  } catch {
    throw new Error('Use o IPv4 do computador na mesma rede Wi-Fi, como http://192.168.1.10:8787.');
  }
}
