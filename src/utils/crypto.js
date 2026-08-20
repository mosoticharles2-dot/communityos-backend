import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function generateIdempotencyKey() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function generateTransactionId() {
  return `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
}
