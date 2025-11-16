import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const srcRoot = path.join(repoRoot, 'loanflow', 'src');

function removeIonIconSpecifier(specifiers) {
  const filtered = specifiers
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== 'IonIcon');
  return filtered;
}

function cleanupFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = content;

  updated = updated.replace(/import\s*\{\s*addIcons\s*\}\s*from\s*'ionicons';\s*/g, '');
  updated = updated.replace(/import\s*\{[^}]*\}\s*from\s*'ionicons\/icons';\s*/g, '');
  updated = updated.replace(/\s*addIcons\(\{[\s\S]*?\}\);\s*/g, '');

  updated = updated.replace(/import\s*\{([^}]*)\}\s*from\s*'@ionic\/angular\/standalone';/g, (match, specifiers) => {
    const filtered = removeIonIconSpecifier(specifiers);
    if (filtered.length === 0) {
      return '';
    }
    return `import { ${filtered.join(', ')} } from '@ionic/angular/standalone';`;
  });

  updated = updated.replace(/IonIcon,\s*/g, '');
  updated = updated.replace(/,\s*IonIcon/g, '');

  if (updated !== content) {
    fs.writeFileSync(filePath, updated, 'utf8');
    return true;
  }
  return false;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let changedCount = 0;
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      changedCount += walk(fullPath);
    } else if (entry.name.endsWith('.ts')) {
      if (cleanupFile(fullPath)) {
        changedCount += 1;
      }
    }
  }
  return changedCount;
}

const totalChanged = walk(srcRoot);
console.log(`Cleaned ${totalChanged} files.`);
