#!/usr/bin/env node
// Scans characters/mythical/elenis/collections/<name>/ and updates data/nimfeya-archive.json.
// Appends new photos with computed + randomly-drafted fields; recomputes width/height/orientation/accent
// for every entry; never touches title/date/photographer/location/styling/light/publication/edition/crop
// on records that already exist.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const COLLECTIONS_DIR = path.join(ROOT, 'characters/mythical/elenis/collections');
const ARCHIVE_PATH = path.join(ROOT, 'data/nimfeya-archive.json');

const COLLECTIONS = {
  chroma: { code: 'CHROMA', prefix: 'CHR', layers: [0, 1, 2], flash: true, restricted: false },
  elenis: { code: 'ELENIS', prefix: 'ELE', layers: [0], flash: false, restricted: false },
  icon: { code: 'ICON', prefix: 'ICO', layers: [0, 1, 2, 3], flash: false, restricted: false },
  lumiere: { code: 'LUMIERE', prefix: 'LUM', layers: [0, 1], flash: false, restricted: false },
  nocturne: { code: 'NOCTURNE', prefix: 'NOC', layers: [2], flash: false, restricted: false }, // overridden true manually per photo when warranted
  persona: { code: 'PERSONA', prefix: 'PER', layers: [1], flash: false, restricted: false },
  private: { code: 'PRIVATE', prefix: 'PRI', layers: [2], flash: false, restricted: true },
  sculpted: { code: 'SCULPTED', prefix: 'SCU', layers: [1, 2], flash: false, restricted: false },
  // Pre-fame test/comp shoots, years before the Elenis house photographers came on board.
  // Fixed era and photographer for the whole collection.
  debut: {
    code: 'DEBUT',
    prefix: 'DEB',
    layers: [2],
    flash: false,
    restricted: false,
    dateRange: [new Date('2017-01-01T00:00:00Z').getTime(), new Date('2020-06-30T00:00:00Z').getTime()],
    photographer: 'P. Kalantzis',
  },
};

const CRISIS_START = new Date('2020-07-04T00:00:00Z').getTime();
const CRISIS_END = new Date('2023-08-20T00:00:00Z').getTime();
const GENERAL_RANGE = [new Date('2014-01-01T00:00:00Z').getTime(), new Date('2061-06-01T00:00:00Z').getTime()];
const ELENIS_RANGE = [new Date('2029-01-01T00:00:00Z').getTime(), new Date('2061-06-01T00:00:00Z').getTime()];

const PHOTOGRAPHERS = [
  { name: 'L. Arenas', weight: 60 },
  { name: 'M. Duquesne', weight: 13.33 },
  { name: 'R. Sato', weight: 13.33 },
  { name: 'V. Okonkwo', weight: 13.34 },
];

const LOCATIONS = [
  'Mercury Studio, Washington',
  'Elenis Flagship, Washington',
  'Private residence',
  'Elenis Atelier, Montevideo',
  'On location',
];

const STYLING = ['Atelier Elenis', 'House archive', 'Personal wardrobe'];

const LIGHT = [
  'Single source, reflector',
  'Two-point, soft',
  'Available light',
  'Hard key, no fill',
  'Mixed, colour gel',
];

const EDITION_SIZES = [8, 12, 16, 24];

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function weightedRandom(items) {
  const total = items.reduce((sum, it) => sum + it.weight, 0);
  let roll = Math.random() * total;
  for (const it of items) {
    roll -= it.weight;
    if (roll <= 0) return it.name;
  }
  return items[items.length - 1].name;
}

function randomDate(collectionKey) {
  const override = COLLECTIONS[collectionKey].dateRange;
  const isElenis = collectionKey === 'elenis';
  const [start, end] = override || (isElenis ? ELENIS_RANGE : GENERAL_RANGE);
  const skipCrisisCheck = Boolean(override) || isElenis;
  let ts;
  do {
    ts = start + Math.random() * (end - start);
  } while (!skipCrisisCheck && ts >= CRISIS_START && ts <= CRISIS_END);
  return new Date(ts).toISOString().slice(0, 10);
}

function randomEdition() {
  const size = randomFrom(EDITION_SIZES);
  const num = 1 + Math.floor(Math.random() * size);
  return `${String(num).padStart(2, '0')}/${size}`;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
    case g: h = (b - r) / d + 2; break;
    default: h = (r - g) / d + 4;
  }
  return { h: h * 60, s, l };
}

function toHex(r, g, b) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

async function computeAccent(filePath) {
  const { data, info } = await sharp(filePath)
    .resize(64, 64, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const buckets = new Map();
  let fallbackR = 0, fallbackG = 0, fallbackB = 0, fallbackN = 0;

  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels], g = data[i * channels + 1], b = data[i * channels + 2];
    fallbackR += r; fallbackG += g; fallbackB += b; fallbackN++;
    const { h, s, l } = rgbToHsl(r, g, b);
    if (s < 0.15 || l < 0.08 || l > 0.92) continue;
    const bucket = Math.floor(h / 15) % 24;
    const cur = buckets.get(bucket) || { rSum: 0, gSum: 0, bSum: 0, weight: 0 };
    cur.rSum += r * s; cur.gSum += g * s; cur.bSum += b * s; cur.weight += s;
    buckets.set(bucket, cur);
  }

  let best = null;
  for (const v of buckets.values()) {
    if (!best || v.weight > best.weight) best = v;
  }

  if (!best) {
    return toHex(fallbackR / fallbackN, fallbackG / fallbackN, fallbackB / fallbackN);
  }
  return toHex(best.rSum / best.weight, best.gSum / best.weight, best.bSum / best.weight);
}

async function loadArchive() {
  if (!existsSync(ARCHIVE_PATH)) return [];
  const raw = await readFile(ARCHIVE_PATH, 'utf-8');
  return JSON.parse(raw);
}

function defaultCropForLayers(layers) {
  if (layers.includes(0) && layers.length === 1) return 'full';
  if (!layers.includes(2) && !layers.includes(3)) return 'half';
  return 'eye';
}

async function main() {
  const archive = await loadArchive();
  const byFile = new Map(archive.map((entry) => [entry.file, entry]));
  const report = { added: [], skipped: [], broken: [] };

  const folderNames = Object.keys(COLLECTIONS);
  const availableFolders = [];
  for (const folder of folderNames) {
    const dir = path.join(COLLECTIONS_DIR, folder);
    if (existsSync(dir)) availableFolders.push(folder);
    else report.broken.push(`Missing folder: ${dir}`);
  }

  // Track highest existing sequence number per collection so new ids continue the count.
  const maxSeq = {};
  for (const entry of archive) {
    const m = /^([A-Z]+)-(\d+)$/.exec(entry.id || '');
    if (m) maxSeq[m[1]] = Math.max(maxSeq[m[1]] || 0, parseInt(m[2], 10));
  }

  const referencedFiles = new Set();

  for (const folder of availableFolders) {
    const meta = COLLECTIONS[folder];
    const dir = path.join(COLLECTIONS_DIR, folder);
    const files = (await readdir(dir)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort();

    for (const filename of files) {
      const absPath = path.join(dir, filename);
      const relPath = path.relative(ROOT, absPath).split(path.sep).join('/');
      referencedFiles.add(relPath);

      let metadata;
      try {
        metadata = await sharp(absPath).metadata();
      } catch (err) {
        report.broken.push(`Unreadable image: ${relPath} (${err.message})`);
        continue;
      }
      const width = metadata.width;
      const height = metadata.height;
      const orientation = width >= height ? 'landscape' : 'portrait';
      const accent = await computeAccent(absPath);

      const existing = byFile.get(relPath);
      if (existing) {
        existing.width = width;
        existing.height = height;
        existing.orientation = orientation;
        existing.accent = accent;
        report.skipped.push(relPath);
        continue;
      }

      maxSeq[meta.prefix] = (maxSeq[meta.prefix] || 0) + 1;
      const id = `${meta.prefix}-${String(maxSeq[meta.prefix]).padStart(3, '0')}`;

      const entry = {
        id,
        file: relPath,
        collection: meta.code,
        title: null, // filled manually after visual review
        model: 'Nymphaea Elenis',
        photographer: meta.photographer || weightedRandom(PHOTOGRAPHERS),
        date: randomDate(folder),
        location: randomFrom(LOCATIONS),
        styling: randomFrom(STYLING),
        light: randomFrom(LIGHT),
        publication: null, // filled manually after visual review (depends on title + restricted status)
        edition: randomEdition(),
        orientation,
        width,
        height,
        accent,
        layers: meta.layers,
        flash: meta.flash,
        restricted: meta.restricted,
      };
      if (folder === 'icon') entry.crop = defaultCropForLayers(meta.layers);

      archive.push(entry);
      byFile.set(relPath, entry);
      report.added.push(id + ' <- ' + relPath);
    }
  }

  for (const entry of archive) {
    if (!referencedFiles.has(entry.file)) {
      report.broken.push(`Catalog entry points to missing file: ${entry.file} (${entry.id})`);
    }
  }

  await writeFile(ARCHIVE_PATH, JSON.stringify(archive, null, 2) + '\n', 'utf-8');

  console.log(`Added:   ${report.added.length}`);
  for (const line of report.added) console.log('  + ' + line);
  console.log(`Recomputed (existing): ${report.skipped.length}`);
  console.log(`Broken/missing: ${report.broken.length}`);
  for (const line of report.broken) console.log('  ! ' + line);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
