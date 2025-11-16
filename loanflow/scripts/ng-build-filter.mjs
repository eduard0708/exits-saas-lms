#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { EOL } from 'node:os';

const args = process.argv.slice(2);
const useShell = process.platform === 'win32';
const runner = 'npx';
const child = spawn(runner, ['ng', 'build', ...args], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: useShell,
});

let suppressedCount = 0;

function attachFilteredStream(stream, target) {
  let buffer = '';
  let suppressBlock = false;

  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.includes('[empty-glob]')) {
        suppressBlock = true;
        suppressedCount += 1;
        continue;
      }

      if (suppressBlock) {
        if (line.trim() === '') {
          suppressBlock = false;
          continue;
        }

        if (!line.startsWith(' ') && !line.startsWith('\t')) {
          suppressBlock = false;
          // fall through to print this line
        } else {
          continue;
        }
      }

      target.write(line + EOL);
    }
  });

  stream.on('end', () => {
    if (!suppressBlock && buffer.length > 0) {
      target.write(buffer);
    }
  });
}

attachFilteredStream(child.stdout, process.stdout);
attachFilteredStream(child.stderr, process.stderr);

child.on('close', (code, signal) => {
  if (suppressedCount > 0) {
    process.stdout.write(`Suppressed ${suppressedCount} known Ionic empty-glob warning${suppressedCount === 1 ? '' : 's'}.` + EOL);
  }
  if (signal) {
    process.exit(1);
  } else {
    process.exit(code ?? 0);
  }
});
