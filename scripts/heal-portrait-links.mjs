#!/usr/bin/env node
// Guards against a recurring Obsidian re-export regression: re-exporting a character note
// sometimes blanks avatar_web/avatar_web_full to "", or leaves them pointing at a filename
// whose extension no longer matches the file on disk (e.g. after a PNG->WEBP conversion pass).
// This script restores what it safely can and reports anything it can't.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CHARACTERS_DIR = path.join(ROOT, 'data/characters');
const IMAGES_DIR = path.join(ROOT, 'data/images/characters');
const PORTRAITS_PATH = path.join(ROOT, 'data/portraits.json');
const LINK_KEYS = ['avatar_web', 'avatar_web_full'];

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
}

function loadActualFiles() {
  const files = new Set(readdirSync(IMAGES_DIR));
  const byStem = new Map();
  for (const f of files) {
    const stem = f.slice(0, f.lastIndexOf('.'));
    if (!byStem.has(stem)) byStem.set(stem, []);
    byStem.get(stem).push(f);
  }
  return { files, byStem };
}

function filenameOf(url) {
  return url.split('/').pop();
}

// Look through this file's git history (newest first) for the most recent commit where `key`
// pointed at a file that still exists today. Used to restore a value an export wiped to "".
function findRestorableValue(relPath, key, actualFiles) {
  let hashes;
  try {
    hashes = git(['log', '--all', '--format=%H', '--', relPath]).trim().split('\n').filter(Boolean);
  } catch {
    return null;
  }
  for (const hash of hashes) {
    let blob;
    try {
      blob = git(['show', `${hash}:${relPath}`]);
    } catch {
      continue;
    }
    let data;
    try {
      data = JSON.parse(blob);
    } catch {
      continue;
    }
    const value = data[key];
    if (value && filenameOf(value) && actualFiles.has(filenameOf(value))) {
      return value;
    }
  }
  return null;
}

function healCharacterFiles({ files, byStem }) {
  const fixes = [];
  const unresolved = [];
  const entries = readdirSync(CHARACTERS_DIR).filter((f) => f.endsWith('.json'));

  for (const entry of entries) {
    const absPath = path.join(CHARACTERS_DIR, entry);
    const relPath = path.relative(ROOT, absPath);
    const raw = readFileSync(absPath, 'utf8');
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      unresolved.push({ file: relPath, reason: `invalid JSON: ${e.message}` });
      continue;
    }

    let changed = false;
    for (const key of LINK_KEYS) {
      const url = data[key];
      if (url === '' || url == null) {
        const restored = findRestorableValue(relPath, key, files);
        if (restored) {
          fixes.push({ file: relPath, name: data.name, key, action: 'restored from history', value: restored });
          data[key] = restored;
          changed = true;
        }
        continue;
      }
      const fname = filenameOf(url);
      if (files.has(fname)) continue;
      const stem = fname.slice(0, fname.lastIndexOf('.'));
      const alt = byStem.get(stem);
      if (alt && alt.length > 0) {
        const fixedUrl = url.slice(0, url.length - fname.length) + alt[0];
        fixes.push({ file: relPath, name: data.name, key, action: 'fixed extension', from: fname, to: alt[0] });
        data[key] = fixedUrl;
        changed = true;
      } else {
        unresolved.push({ file: relPath, name: data.name, key, reason: `no file on disk matches "${fname}"` });
      }
    }

    if (changed) {
      writeFileSync(absPath, JSON.stringify(data, null, 2), 'utf8');
    }
  }

  return { fixes, unresolved };
}

function checkPortraitsRegistry({ files, byStem }) {
  const unresolved = [];
  if (!existsSync(PORTRAITS_PATH)) return unresolved;
  const data = JSON.parse(readFileSync(PORTRAITS_PATH, 'utf8'));
  for (const [key, url] of Object.entries(data)) {
    if (key.startsWith('_') || typeof url !== 'string') continue;
    const fname = filenameOf(url);
    if (files.has(fname)) continue;
    unresolved.push({ file: 'data/portraits.json', name: key, reason: `no file on disk matches "${fname}"` });
  }
  return unresolved;
}

const state = loadActualFiles();
const { fixes, unresolved } = healCharacterFiles(state);
const portraitIssues = checkPortraitsRegistry(state);

if (fixes.length) {
  console.log(`Fixed ${fixes.length} link(s):`);
  for (const f of fixes) console.log(`  - ${f.name} (${f.file}) ${f.key}: ${f.action}`);
}
if (unresolved.length || portraitIssues.length) {
  console.log(`\n${unresolved.length + portraitIssues.length} issue(s) need manual attention:`);
  for (const u of [...unresolved, ...portraitIssues]) {
    console.log(`  - ${u.name ?? u.file} (${u.file}) ${u.key ?? ''}: ${u.reason}`);
  }
}
if (!fixes.length && !unresolved.length && !portraitIssues.length) {
  console.log('All portrait links check out.');
}

// For CI: signal whether anything was auto-fixed, and fail if something needs a human.
process.exitCode = unresolved.length || portraitIssues.length ? 1 : 0;
if (process.env.GITHUB_OUTPUT) {
  writeFileSync(process.env.GITHUB_OUTPUT, `changed=${fixes.length > 0}\n`, { flag: 'a' });
}
