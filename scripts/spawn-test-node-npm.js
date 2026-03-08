const path = require('path');
const fs = require('fs');
const npmCliPath = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
console.log('npmCliPath', npmCliPath, fs.existsSync(npmCliPath));
const { spawn } = require('child_process');
const child = spawn(process.execPath, [npmCliPath, '--version'], { stdio: 'inherit', shell: false });
child.on('error', (e) => { console.error('ERR', e); process.exit(1); });
child.on('close', (c) => { console.log('CODE', c); process.exit(c ?? 0); });
