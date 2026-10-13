// Generates the "Secret Key (for OAuth)" that Supabase's Apple provider needs:
// an ES256 JWT signed with your Sign in with Apple key. Apple caps it at
// 6 months, so re-run this and paste the new value into Supabase before then.
//
//   node scripts/apple-client-secret.mjs <path-to-AuthKey_XXXX.p8> <TEAM_ID> <KEY_ID> <SERVICES_ID>
//
// Keep the .p8 outside this repo. The JWT is printed to the terminal only;
// paste it into Supabase and don't save it anywhere else.
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const [keyPath, teamId, keyId, servicesId] = process.argv.slice(2);
if (!keyPath || !teamId || !keyId || !servicesId) {
  console.error('Usage: node scripts/apple-client-secret.mjs <AuthKey.p8> <TEAM_ID> <KEY_ID> <SERVICES_ID>');
  process.exit(1);
}

const SIX_MONTHS = 15777000; // seconds; Apple's maximum
const now = Math.floor(Date.now() / 1000);
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
const claims = { iss: teamId, iat: now, exp: now + SIX_MONTHS, aud: 'https://appleid.apple.com', sub: servicesId };
const input = `${b64url(header)}.${b64url(claims)}`;

const key = createPrivateKey(readFileSync(keyPath));
const signature = sign('sha256', Buffer.from(input), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');

console.log(`${input}.${signature}`);
console.error(`\nExpires ${new Date((now + SIX_MONTHS) * 1000).toDateString()}. Set a reminder to renew a week before.`);
