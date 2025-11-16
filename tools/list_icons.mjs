import fs from 'fs';
import path from 'path';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
let searchRoot = path.join(repoRoot, 'loanflow', 'src');
if (!fs.existsSync(searchRoot)) {
  searchRoot = path.join('loanflow', 'src');
}

const tagPattern = /<ion-icon[^>]*?(?:\[(?:name|icon)\]|(?:name|icon))\s*=\s*("([^"]+)"|'([^']+)')/gi;
const tsPattern = /addIcons\(([^)]+)\)/g;
const stringPattern = /'([^']+)'|"([^"]+)"/g;

const iconNamePattern = /^[a-z][a-z0-9-]*$/i;
const values = new Set();

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (/\.html$/i.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      let match;
      while ((match = tagPattern.exec(content)) !== null) {
        const value = match[2] ?? match[3];
        if (value && iconNamePattern.test(value)) {
          values.add(value);
        }
      }
    } else if (/\.ts$/i.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      let match;
      while ((match = tagPattern.exec(content)) !== null) {
        const value = match[2] ?? match[3];
        if (value && iconNamePattern.test(value)) {
          values.add(value);
        }
      }

      tsPattern.lastIndex = 0;
      while ((match = tsPattern.exec(content)) !== null) {
        const block = match[1];
        let inner;
        stringPattern.lastIndex = 0;
        while ((inner = stringPattern.exec(block)) !== null) {
          const value = inner[1] ?? inner[2];
          if (value && iconNamePattern.test(value)) {
            values.add(value);
          }
        }
      }
    }
  }
}

walk(searchRoot);

console.log(Array.from(values).sort().join('\n'));
