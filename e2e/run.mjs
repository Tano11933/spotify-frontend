import { spawn } from 'node:child_process'
import { mkdtemp, rm, rmdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

const frontend = fileURLToPath(new URL('../', import.meta.url))
const backend = resolve(process.env.E2E_BACKEND_DIR || join(frontend, '../spotify-backend'))

function run(command, args, options) {
  const child = spawn(command, args, { windowsHide: true, ...options })
  const done = new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('close', (code, signal) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} exited with ${code ?? signal}`))
    })
  })
  return { child, done }
}

async function ready(server) {
  const lines = createInterface({ input: server.child.stdout })
  let timer
  const startup = new Promise((resolve, reject) => {
    lines.on('line', (line) => {
      console.log(line)
      const match = /^E2E_READY (http:\/\/127\.0\.0\.1:\d+)$/.exec(line)
      if (match) resolve(match[1])
    })
    timer = setTimeout(() => reject(new Error('E2E backend did not become ready')), 180_000)
  })
  try {
    const origin = await Promise.race([
      startup,
      server.done.then(() => { throw new Error('E2E backend stopped before readiness') }),
    ])
    const response = await fetch(origin + '/ready', { signal: AbortSignal.timeout(10_000) })
    if (!response.ok) throw new Error(`E2E backend readiness returned ${response.status}`)
    return origin
  } finally {
    clearTimeout(timer)
  }
}

const temp = await mkdtemp(join(tmpdir(), 'melodia-e2e-run-'))
const binary = join(temp, process.platform === 'win32' ? 'backend.exe' : 'backend')
let server
let browserTests
let interrupted = false

function interrupt() {
  interrupted = true
  server?.child.stdin.end()
  if (process.platform !== 'win32') browserTests?.child.kill('SIGTERM')
}

process.once('SIGINT', interrupt)
process.once('SIGTERM', interrupt)

try {
  await run('go', ['build', '-o', binary, './test/e2e'], { cwd: backend, stdio: 'inherit' }).done
  if (interrupted) throw new Error('E2E run interrupted')
  server = run(binary, [], { cwd: temp, stdio: ['pipe', 'pipe', 'inherit'] })
  server.child.stdin.on('error', (error) => {
    if (error.code !== 'EPIPE' && error.code !== 'ERR_STREAM_DESTROYED') console.error(error)
  })
  const origin = await ready(server)
  if (interrupted) throw new Error('E2E run interrupted')
  browserTests = run(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)], {
    cwd: frontend,
    env: { ...process.env, E2E_API_URL: origin },
    stdio: 'inherit',
  })
  await Promise.race([
    browserTests.done,
    server.done.then(() => { throw new Error('E2E backend stopped while Playwright was running') }),
  ])
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  if (server) {
    server.child.stdin.end()
    try {
      await server.done
    } catch (error) {
      console.error(error.message)
      process.exitCode = 1
    }
  }
  // If the backend exited first, let Playwright finish tearing down Vite.
  if (browserTests) await browserTests.done.catch(() => {})
  await rm(binary, { force: true })
  await rmdir(temp)
  if (interrupted) process.exitCode = 1
}
