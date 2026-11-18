export function newIdempotencyKey(): string {
  return `ikey_${crypto.randomUUID()}`;
}
