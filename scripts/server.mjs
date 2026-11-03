// Starts the local Python service (server/main.py) on any OS, restarting it when server/*.py changes.
// Prefers the project's .venv so it works without activating it; on Windows
// `python3` is usually the Microsoft Store stub, so plain `python` is the fallback.
//
// Reload lives here instead of `uvicorn --reload`: on Windows uvicorn restarts its worker with
// CTRL_C_EVENT, which hits every process in the console and takes npm down with it.
import { spawn } from 'node:child_process';
import { existsSync, watch } from 'node:fs';
import { join } from 'node:path';

const win = process.platform === 'win32';
const venv = join('.venv', win ? 'Scripts/python.exe' : 'bin/python');
const python = existsSync(venv) ? venv : win ? 'python' : 'python3';
const args = ['-m', 'uvicorn', 'server.main:app', '--port', process.env.FRAME_PORT ?? '8765'];

let child = null;
let restarting = false;

function start() {
  console.log(`> ${python} ${args.join(' ')}`);
  child = spawn(python, args, { stdio: 'inherit' });
  child.on('error', (err) => {
    console.error(`Não consegui iniciar o Python (${python}): ${err.message}`);
    console.error('Crie o ambiente com "python -m venv .venv" e instale server/requirements.txt.');
    process.exit(1);
  });
  child.on('exit', (code) => {
    if (restarting) {
      restarting = false;
      start();
    } else if (code !== null) {
      process.exit(code);
    }
  });
}

let timer = null;
watch('server', (_event, file) => {
  if (!file?.endsWith('.py')) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    console.log(`\n[frame] ${file} mudou; reiniciando o serviço...`);
    restarting = true;
    child.kill();
  }, 200);
});

start();
