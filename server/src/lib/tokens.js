import crypto from 'node:crypto';
import { SignJWT, jwtVerify, importPKCS8, importSPKI } from 'jose';
import { env, need } from './env.js';

const ALG = 'EdDSA';
const ACCESS_TTL_S  = 15 * 60;                 // kurz: lebt nur im Arbeitsspeicher
const REFRESH_TTL_S = 400 * 24 * 60 * 60;      // lang: sonst verliert ein anonymer Spieler alles

let privKey, pubKey;
async function keys() {
  if (!privKey) {
    privKey = await importPKCS8(need('JWT_PRIVATE_KEY').replace(/\\n/g, '\n'), ALG);
    pubKey  = await importSPKI(need('JWT_PUBLIC_KEY').replace(/\\n/g, '\n'), ALG);
  }
  return { privKey, pubKey };
}

// Access-Token: JWT, damit jede Anfrage ohne Datenbankzugriff geprueft werden
// kann. 15 Minuten -- ein gestohlenes Token ist damit schnell wertlos, und die
// Shell haelt es nur im Arbeitsspeicher (nie in localStorage).
export async function signAccess(userId, sessionId) {
  const { privKey } = await keys();
  return new SignJWT({ sub: userId, jti: sessionId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_S}s`)
    .setIssuer('totersignal')
    .sign(privKey);
}

export async function verifyAccess(token) {
  const { pubKey } = await keys();
  const { payload } = await jwtVerify(token, pubKey, { issuer: 'totersignal' });
  return payload;
}

// Refresh-Token: UNDURCHSICHTIG, nicht JWT. Ein JWT liesse sich nicht
// widerrufen; hier genuegt ein DELETE. Gespeichert wird nur der Hash.
export function newRefreshToken() {
  const raw = crypto.randomBytes(32).toString('base64url');
  return { raw, hash: sha256(raw) };
}

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest();

export function uaHash(ua) {
  if (!ua) return null;
  // Gepfeffert: aus dem Hash laesst sich der User-Agent nicht zurueckrechnen,
  // und ohne den Pfeffer auch nicht per Woerterbuch raten.
  return crypto.createHash('sha256').update(String(ua) + (env.UA_PEPPER || '')).digest();
}

// Datensparsamkeit: nur das Netz, nie die volle Adresse. /24 bei IPv4,
// /48 bei IPv6 -- reicht fuer Missbrauchserkennung, identifiziert aber keinen
// einzelnen Anschluss.
export function ipPrefix(ip) {
  if (!ip) return null;
  const clean = String(ip).replace(/^::ffff:/, '');
  if (clean.includes(':')) {
    const parts = clean.split(':');
    return parts.slice(0, 3).join(':') + '::/48';
  }
  const o = clean.split('.');
  if (o.length !== 4) return null;
  return `${o[0]}.${o[1]}.${o[2]}.0/24`;
}

export const ACCESS_TTL = ACCESS_TTL_S;
export const REFRESH_TTL = REFRESH_TTL_S;
