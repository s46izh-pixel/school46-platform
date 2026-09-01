import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { readAdminStore } from "./admin-store";

const defaultPassword = "school46";
const cookieName = "school46_admin_session";
const sessionMaxAge = 60 * 60 * 24 * 7;

export { cookieName, sessionMaxAge };

export function createPasswordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${hashPassword(password, salt)}`;
}

export async function verifyAdminPassword(password: string) {
  const store = await readAdminStore();
  if (!store.adminPasswordHash) return password === defaultPassword;
  const [salt, savedHash] = store.adminPasswordHash.split(":");
  if (!salt || !savedHash) return false;
  return safeEqual(hashPassword(password, salt), savedHash);
}

export async function createAdminSessionValue() {
  const store = await readAdminStore();
  const issuedAt = String(Date.now());
  return `${issuedAt}.${signSession(issuedAt, store.adminPasswordHash || defaultPassword)}`;
}

export async function verifyAdminSession(value: string | undefined) {
  if (!value) return false;
  const [issuedAt, signature] = value.split(".");
  const timestamp = Number(issuedAt);
  if (!issuedAt || !signature || !Number.isFinite(timestamp)) return false;
  if (Date.now() - timestamp > sessionMaxAge * 1000) return false;

  const store = await readAdminStore();
  const expected = signSession(issuedAt, store.adminPasswordHash || defaultPassword);
  return safeEqual(signature, expected);
}

function hashPassword(password: string, salt: string) {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

function signSession(issuedAt: string, secret: string) {
  return createHmac("sha256", secret).update(issuedAt).digest("hex");
}

function safeEqual(first: string, second: string) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer);
}
