import { nanoid } from 'nanoid';

export function createVaultToken() {
  return nanoid(32).replace(/-/g, 'a').replace(/_/g, 'b');
}
