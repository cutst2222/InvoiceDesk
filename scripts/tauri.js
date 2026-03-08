const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

const mode = process.argv[2];
const isWindows = process.platform === 'win32';

const npmCliPath = isWindows
  ? path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
  : null;
const cargoBin = path.join(os.homedir(), '.cargo', 'bin');

if (isWindows && !fs.existsSync(npmCliPath)) {
  console.error(`Unable to locate npm cli at ${npmCliPath}`);
  process.exit(1);
}

const ensureCargoOnPath = () => {
  const pathKey =
    Object.keys(process.env).find((key) => key.toLowerCase() === 'path') ||
    (process.platform === 'win32' ? 'Path' : 'PATH');
  const currentPath = process.env[pathKey] || '';
  const parts = currentPath
    .split(path.delimiter)
    .filter(Boolean)
    .map((entry) => entry.toLowerCase());

  if (!parts.includes(cargoBin.toLowerCase())) {
    process.env[pathKey] = `${cargoBin}${path.delimiter}${currentPath}`;
  }
};

const run = (command, args) => {
  ensureCargoOnPath();

  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: false,
  });

  return child;
};

const runNpm = (args) => {
  if (isWindows) {
    return run(process.execPath, [npmCliPath, ...args]);
  }

  return run('npm', args);
};

const runSequence = async (steps) => {
  for (const args of steps) {
    const exitCode = await new Promise((resolve) => {
      const child = runNpm(args);
      child.on('close', (code) => resolve(code));
    });

    if (exitCode !== 0) {
      process.exit(exitCode);
    }
  }
};

if (mode === 'dev') {
  // Run backend API and Tauri dev shell together for local desktop development.
  const backend = runNpm(['--prefix', 'backend', 'run', 'dev']);
  const tauri = runNpm(['--prefix', 'tauri-app', 'run', 'tauri', 'dev']);

  const shutdown = () => {
    backend.kill();
    tauri.kill();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  tauri.on('close', (code) => {
    backend.kill();
    process.exit(code ?? 0);
  });
} else if (mode === 'build') {
  // Build web assets first, then package the desktop application.
  runSequence([
    ['--prefix', 'frontend', 'run', 'build'],
    ['--prefix', 'tauri-app', 'run', 'tauri', 'build'],
  ]);
} else {
  console.error('Usage: npm run tauri <dev|build>');
  process.exit(1);
}
