import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const initialPassword = 'Initial-test-passphrase-27';
const changedPassword = 'Changed-test-passphrase-38';

function passwordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}$${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

async function unusedPort() {
  const listener = net.createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const { port } = listener.address();
  await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function startServer(storageDirectory, initialHash) {
  const port = await unusedPort();
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    PORT: String(port),
    SESSION_SECRET: 'password-test-session-secret',
    OWNER_PASSWORD_HASH: initialHash,
    STORAGE_DIRECTORY: storageDirectory
  };
  delete env.DATABASE_PATH;
  const child = spawn(process.execPath, ['server.js'], { cwd: projectRoot, env });
  let output = '';
  const started = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Server did not start: ${output}`)), 10000);
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
      if (output.includes(`http://localhost:${port}`)) {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.stderr.on('data', (chunk) => { output += chunk.toString(); });
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('exit', (code) => {
      if (!output.includes(`http://localhost:${port}`)) {
        clearTimeout(timeout);
        reject(new Error(`Server exited (${code}): ${output}`));
      }
    });
  });
  await started;
  return {
    child,
    baseUrl: `http://127.0.0.1:${port}`,
    async stop() {
      if (child.exitCode !== null) return;
      child.kill();
      await once(child, 'exit');
    }
  };
}

async function login(baseUrl, password) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const setCookie = response.headers.get('set-cookie') || '';
  return { response, cookie: setCookie.split(';', 1)[0] };
}

test('owner password changes securely and persists across restarts', async (t) => {
  const storageDirectory = await fs.mkdtemp(path.join(projectRoot, 'data', 'password-test-'));
  const initialHash = passwordHash(initialPassword);
  let server;
  t.after(async () => {
    await server?.stop();
    await fs.rm(storageDirectory, { recursive: true, force: true });
  });

  server = await startServer(storageDirectory, initialHash);
  const firstLogin = await login(server.baseUrl, initialPassword);
  assert.equal(firstLogin.response.status, 204);
  assert.ok(firstLogin.cookie.startsWith('musah_owner_session='));

  const weakPassword = await fetch(`${server.baseUrl}/api/auth/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: firstLogin.cookie },
    body: JSON.stringify({ currentPassword: initialPassword, newPassword: 'short' })
  });
  assert.equal(weakPassword.status, 400);

  const changed = await fetch(`${server.baseUrl}/api/auth/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: firstLogin.cookie },
    body: JSON.stringify({ currentPassword: initialPassword, newPassword: changedPassword })
  });
  assert.equal(changed.status, 204);

  const revokedSession = await fetch(`${server.baseUrl}/api/auth/me`, {
    headers: { Cookie: firstLogin.cookie }
  });
  assert.equal(revokedSession.status, 401);
  assert.equal((await login(server.baseUrl, initialPassword)).response.status, 401);

  await server.stop();
  server = await startServer(storageDirectory, initialHash);
  assert.equal((await login(server.baseUrl, initialPassword)).response.status, 401);
  assert.equal((await login(server.baseUrl, changedPassword)).response.status, 204);
});