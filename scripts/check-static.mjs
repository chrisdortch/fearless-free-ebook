import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const root = process.cwd();
const artifactPath = join(root, '.clover/artifacts/static-integrity.json');
const requiredFiles = [
  'index.html',
  'read.html',
  'admin.html',
  '404.html',
  'styles.css',
  'script.js',
  'assets/music/playlist.json',
  'downloads/Fearless_Book1_RollinD_Free_Ebook.pdf',
  'downloads/Fearless_Book1_RollinD_Free_Ebook.epub',
  'downloads/Fearless_Book1_RollinD_FullRes_Images.zip',
  'downloads/Fearless_RollinD_Companion_Album_MP3s.zip',
  'docs/download-checksums.sha256'
];
const htmlFiles = ['index.html', 'read.html', 'admin.html', '404.html'];
const missing = [];
const checkedReferences = [];
const warnings = [];

function localPathFromReference(reference, sourceFile) {
  const trimmed = reference.trim();
  if (
    !trimmed ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('//') ||
    /^(?:https?:|mailto:|tel:|data:|blob:|javascript:)/i.test(trimmed)
  ) {
    return null;
  }

  let pathPart = trimmed.split('#')[0].split('?')[0];
  if (!pathPart) return null;
  try {
    pathPart = decodeURIComponent(pathPart);
  } catch {
    warnings.push(`Could not decode reference ${reference} in ${sourceFile}`);
  }

  if (pathPart === '/') return 'index.html';
  const sourceDirectory = dirname(sourceFile);
  const relative = pathPart.startsWith('/')
    ? pathPart.slice(1)
    : join(sourceDirectory === '.' ? '' : sourceDirectory, pathPart);
  const normalized = normalize(relative).replace(/^\.\//, '');
  return normalized.endsWith('/') ? `${normalized}index.html` : normalized;
}

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) missing.push({ source: 'required-files', reference: file, resolved: file });
}

for (const htmlFile of htmlFiles) {
  const htmlPath = join(root, htmlFile);
  if (!existsSync(htmlPath)) continue;
  const html = readFileSync(htmlPath, 'utf8');
  const referencePattern = /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  for (const match of html.matchAll(referencePattern)) {
    const resolved = localPathFromReference(match[1], htmlFile);
    if (!resolved) continue;
    checkedReferences.push({ source: htmlFile, reference: match[1], resolved });
    if (!existsSync(join(root, resolved))) {
      missing.push({ source: htmlFile, reference: match[1], resolved });
    }
  }
}

const css = readFileSync(join(root, 'styles.css'), 'utf8');
for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
  const resolved = localPathFromReference(match[1], 'styles.css');
  if (!resolved) continue;
  checkedReferences.push({ source: 'styles.css', reference: match[1], resolved });
  if (!existsSync(join(root, resolved))) {
    missing.push({ source: 'styles.css', reference: match[1], resolved });
  }
}

const playlist = JSON.parse(readFileSync(join(root, 'assets/music/playlist.json'), 'utf8'));
if (!Array.isArray(playlist.tracks) || playlist.tracks.length === 0) {
  missing.push({ source: 'assets/music/playlist.json', reference: 'tracks', resolved: 'non-empty array required' });
} else {
  playlist.tracks.forEach((track, index) => {
    for (const field of ['title', 'audioUrl', 'videoUrl', 'imageUrl']) {
      if (!track?.[field]) {
        missing.push({
          source: 'assets/music/playlist.json',
          reference: `tracks[${index}].${field}`,
          resolved: 'required value missing'
        });
      }
    }
  });
}

const script = readFileSync(join(root, 'script.js'), 'utf8');
if (/const\s+ADMIN_PIN\s*=/.test(script)) {
  warnings.push('The Admin PIN is client-side and must not be treated as authentication or secret protection.');
}

const report = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  requiredFileCount: requiredFiles.length,
  checkedReferenceCount: checkedReferences.length,
  playlistTrackCount: Array.isArray(playlist.tracks) ? playlist.tracks.length : 0,
  missing,
  warnings,
  status: missing.length ? 'failed' : 'passed'
};

mkdirSync(dirname(artifactPath), { recursive: true });
writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

warnings.forEach((warning) => console.warn(`Warning: ${warning}`));
if (missing.length) {
  missing.forEach((item) => console.error(`Missing ${item.resolved} referenced by ${item.source}`));
  process.exit(1);
}

console.log(`Static integrity passed: ${checkedReferences.length} local references and ${report.playlistTrackCount} playlist tracks checked.`);
