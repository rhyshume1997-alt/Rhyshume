'use strict';
/*
Client access: temporary password generator and new password rules.
Inputs : crypto randomness; a candidate password, the client's email and (optionally) nothing else. Outputs: a string, or { ok, reasons }.
Rules  : the temporary password is at least 16 characters from an alphabet with no look-alike characters (no 0 O o 1 l I i 5 S 2 Z 8 B),
         has at least one capital, one small letter and one digit, and is drawn with crypto.randomInt (no modulo bias).
         A chosen password needs 12 or more characters (at most 128), not on the common list, not built from the email, not a repeat or
         a simple run. The page repeats the same rules for hints, the server decides.
Must not change: the alphabet, the minimum lengths, the use of crypto.randomInt.
*/
const crypto = require('node:crypto');
const UP = 'ACDEFGHJKMNPQRTUVWXY', LOW = 'abcdefghjkmnpqrtuvwxy', DIG = '34679';
const ALPHABET = UP + LOW + DIG;
const TEMP_LENGTH = 16;

function generateTemp(randomInt) {
  const ri = randomInt || crypto.randomInt;
  for (;;) {
    let s = '';
    for (let i = 0; i < TEMP_LENGTH; i++) s += ALPHABET[ri(ALPHABET.length)];
    if (/[A-Z]/.test(s) && /[a-z]/.test(s) && /[0-9]/.test(s)) return s;
  }
}

const COMMON = ('password,password1,password12,password123,password1234,passw0rd,p@ssw0rd,p@ssword,letmein,letmein123,welcome,welcome1,welcome123,qwerty,qwerty123,qwertyuiop,qwerty1234,' +
  'abc123,abc12345,abcd1234,iloveyou,admin,admin123,administrator,changeme,changeme123,trustno1,monkey,dragon,football,baseball,master,sunshine,princess,shadow,superman,' +
  'michael,jennifer,hunter,hunter2,starwars,whatever,freedom,secret,secret123,login,loginlogin,access,flower,hello,hello123,helloworld,computer,internet,service,' +
  'summer,winter,spring,autumn,glasgow,scotland,rangers,celtic,london,manchester,liverpool,arsenal,chelsea,bakery,business,company,mybusiness,' +
  '111111,123123,123321,12345,123456,1234567,12345678,123456789,1234567890,12345678910,0123456789,987654321,9876543210,1q2w3e4r,1q2w3e4r5t,1qaz2wsx,zaq12wsx,asdfghjkl,asdfgh,zxcvbnm,qazwsx,' +
  'temp,temporary,tempo,temp1234,temppassword,newpassword,newpass,mypassword,yourpassword,thepassword,passwordpassword,password!,password1!,password123!,welcome!,welcome1!,letmein!,' +
  'iloveyou1,monkey123,dragon123,football1,baseball1,sunshine1,princess1,master123,shadow123,superman1,qwerty12,qwerty1,qwertyui,qwerty12345,aa123456,a123456789,abcdef123456,abcdefghijkl,aaaaaaaaaaaa,111111111111,000000000000,123456123456,121212121212,' +
  'summer2024,summer2025,summer2026,winter2024,winter2025,winter2026,spring2025,spring2026,autumn2025,autumn2026,password2024,password2025,password2026,welcome2024,welcome2025,welcome2026,january2026,november2026').split(',');
const COMMON_SET = new Set(COMMON);

function normalise(p) { return String(p).toLowerCase().replace(/[^a-z0-9]/g, ''); }
function isRun(p) {
  const s = String(p).toLowerCase(); if (s.length < 6) return false;
  let up = 0, down = 0, same = 0;
  for (let i = 1; i < s.length; i++) { const d = s.charCodeAt(i) - s.charCodeAt(i - 1); if (d === 1) up++; if (d === -1) down++; if (d === 0) same++; }
  return up >= s.length - 2 || down >= s.length - 2 || same >= s.length - 2;
}
// Returns { ok, reasons: [codes] }. Codes are stable strings the page maps to plain wording.
function checkNew(pw, email) {
  const reasons = [], p = typeof pw === 'string' ? pw : '';
  if (p.length < 12) reasons.push('short');
  if (p.length > 128) reasons.push('long');
  if (/[\u0000-\u001f\u007f]/.test(p)) reasons.push('control');
  const n = normalise(p);
  if (COMMON_SET.has(p.toLowerCase()) || COMMON_SET.has(n)) reasons.push('common');
  const local = normalise(String(email || '').split('@')[0]);
  if (local.length >= 4 && n.includes(local)) reasons.push('email');
  if (/password|passw0rd|qwerty|asdfgh|zxcvb|123456|abcdef|letmein/.test(n)) reasons.push('common');
  if (p.length && (isRun(p) || /^(.{1,4})\1+$/.test(p))) reasons.push('pattern');
  if (new Set(p).size < 5 && p.length) reasons.push('pattern');
  return { ok: reasons.length === 0, reasons: Array.from(new Set(reasons)) };
}
module.exports = { generateTemp, checkNew, ALPHABET, TEMP_LENGTH, COMMON_COUNT: COMMON_SET.size };
