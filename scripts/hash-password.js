import crypto from 'node:crypto';
import { stdin, stdout } from 'node:process';

if (!stdin.isTTY) throw new Error('Run this command in an interactive terminal.');

let password = '';
let finished = false;
stdout.write('Enter the owner password (input is hidden): ');
stdin.setRawMode(true);
stdin.setEncoding('utf8');
stdin.resume();

function finish(cancelled = false) {
  if (finished) return;
  finished = true;
  stdin.setRawMode(false);
  stdin.pause();
  stdout.write('\n');
  if (!cancelled) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    stdout.write(`OWNER_PASSWORD_HASH=${salt}$${hash}\n`);
  }
  password = '';
  stdin.removeListener('data', onInput);
}

function onInput(input) {
  for (const character of input) {
    if (character === '\u0003' || character === '\u0004') return finish(true);
    if (character === '\r' || character === '\n') return finish();
    if (character === '\u007f' || character === '\b') {
      password = Array.from(password).slice(0, -1).join('');
    } else if (character >= ' ') {
      password += character;
    }
  }
}

stdin.on('data', onInput);
