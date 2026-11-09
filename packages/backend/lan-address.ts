import { networkInterfaces } from 'node:os';
import { isIP } from 'node:net';

export function isPrivateIPv4(value: string) {
  return isIP(value) === 4 && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(value);
}
export function lanAddress(override = process.env.AXIOM_LAN_HOST): string {
  if (override) {
    if (!isPrivateIPv4(override))
      throw new Error('AXIOM_LAN_HOST precisa ser um IPv4 da rede privada.');
    return override;
  }
  const address = Object.entries(networkInterfaces())
    .filter(([name]) => !/virtual|vbox|vmware|loopback|wsl|hyper-v/i.test(name))
    .flatMap(([, items]) => items || [])
    .find(
      (item) => item.family === 'IPv4' && !item.internal && isPrivateIPv4(item.address),
    )?.address;
  if (!address)
    throw new Error('Conecte o computador e o Android à mesma rede Wi-Fi para preparar o acesso.');
  return address;
}
