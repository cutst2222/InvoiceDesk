const { spawn } = require('child_process');
const child = spawn('cmd.exe', ['/d', '/s', '/c', 'echo hi'], { stdio: 'inherit', shell: false });
child.on('error', (e) => { console.error('ERR', e); process.exit(1); });
child.on('close', (c) => { console.log('CODE', c); process.exit(c ?? 0); });
