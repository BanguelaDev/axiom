export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value)
    throw new Error(`Configure ${name} no .env local. Não envie chaves ao app ou ao GitHub.`);
  return value;
}
