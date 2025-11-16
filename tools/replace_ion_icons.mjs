import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const loanflowRoot = path.join(repoRoot, 'loanflow');
const srcRoot = path.join(loanflowRoot, 'src');
const emojiMapPath = path.join(srcRoot, 'assets', 'config', 'emoji-icon-map.json');

const emojiMap = JSON.parse(fs.readFileSync(emojiMapPath, 'utf8'));
const missingIcons = new Set();
const changedFiles = [];

const iconTagRegex = /<ion-icon([^>]*)>(\s*)<\/ion-icon>/gis;
const iconSelfClosingRegex = /<ion-icon([^>]*)\/>/gis;

const ATTRIBUTES = ['name', '[name]', 'icon', '[icon]'];

function escapeAttr(attr) {
  return attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractLiteral(attrs, attr) {
  const escaped = escapeAttr(attr);
  const doubleRegex = new RegExp(`${escaped}\\s*=\\s*"([^\"]*)"`, 'i');
  const singleRegex = new RegExp(`${escaped}\\s*=\\s*'([^']*)'`, 'i');
  const doubleMatch = attrs.match(doubleRegex);
  if (doubleMatch) return doubleMatch[1];
  const singleMatch = attrs.match(singleRegex);
  if (singleMatch) return singleMatch[1];
  return null;
}

function unwrapLiteral(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith('{{') || trimmed.includes('?') || trimmed.includes(':')) {
    return null;
  }
  return trimmed;
}

function removeAttribute(attrs, attr) {
  const escaped = escapeAttr(attr);
  const doubleRegex = new RegExp(`(?:\r?\n)?\s*${escaped}\\s*=\\s*"[^\"]*"`, 'gi');
  const singleRegex = new RegExp(`(?:\r?\n)?\s*${escaped}\\s*=\\s*'[^']*'`, 'gi');
  return attrs.replace(doubleRegex, '').replace(singleRegex, '');
}

function ensureEmojiClass(attrs) {
  const doubleRegex = /class\s*=\s*"([^"]*)"/i;
  const singleRegex = /class\s*=\s*'([^']*)'/i;

  if (doubleRegex.test(attrs)) {
    return attrs.replace(doubleRegex, (_, classes) => {
      const next = addEmojiClass(classes);
      return `class="${next}"`;
    });
  }

  if (singleRegex.test(attrs)) {
    return attrs.replace(singleRegex, (_, classes) => {
      const next = addEmojiClass(classes);
      return `class='${next}'`;
    });
  }

  const separator = attrs.length && !attrs.trim().endsWith('\n') ? ' ' : '\n  ';
  return `${attrs}${separator}class="emoji-icon"`;
}

function addEmojiClass(classes) {
  const classList = classes.split(/\s+/).filter(Boolean);
  if (!classList.includes('emoji-icon')) {
    classList.unshift('emoji-icon');
  }
  return classList.join(' ');
}

function mapToEmoji(name) {
  if (!name) return null;
  const normalized = name.toLowerCase();
  return emojiMap[normalized] || emojiMap[normalized.replace(/-outline$/, '')] || null;
}

function convertMatch(attrs) {
  let iconLiteral = null;
  for (const attr of ATTRIBUTES) {
    const literal = extractLiteral(attrs, attr);
    if (literal) {
      iconLiteral = unwrapLiteral(literal);
      if (iconLiteral) break;
    }
  }

  if (!iconLiteral) {
    return null;
  }

  const emoji = mapToEmoji(iconLiteral);
  if (!emoji) {
    missingIcons.add(iconLiteral);
    return null;
  }

  let updatedAttrs = attrs;
  for (const attr of ATTRIBUTES) {
    updatedAttrs = removeAttribute(updatedAttrs, attr);
  }
  updatedAttrs = ensureEmojiClass(updatedAttrs);

  return `<span${updatedAttrs}>${emoji}</span>`;
}

function transformContent(content) {
  let changed = false;
  let updated = content.replace(iconTagRegex, (match, attrs, whitespace) => {
    const replacement = convertMatch(attrs);
    if (replacement) {
      changed = true;
      return `${replacement}${whitespace ?? ''}`;
    }
    return match;
  });

  updated = updated.replace(iconSelfClosingRegex, (match, attrs) => {
    const replacement = convertMatch(attrs);
    if (replacement) {
      changed = true;
      return replacement;
    }
    return match;
  });

  return { changed, updated };
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      walk(path.join(dir, entry.name));
    } else if (entry.name.endsWith('.html') || entry.name.endsWith('.ts')) {
      const filePath = path.join(dir, entry.name);
      const original = fs.readFileSync(filePath, 'utf8');
      const { changed, updated } = transformContent(original);
      if (changed) {
        fs.writeFileSync(filePath, updated, 'utf8');
        changedFiles.push(path.relative(repoRoot, filePath));
      }
    }
  }
}

walk(srcRoot);

if (missingIcons.size) {
  console.log('Missing icon mappings for:', Array.from(missingIcons).join(', '));
}

console.log(`Updated ${changedFiles.length} files.`);
