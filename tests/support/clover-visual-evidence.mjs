import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const git = (...args) => {
  const r = spawnSync('git', args, { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
};
const config = () => JSON.parse(readFileSync(path.join(process.cwd(), '.clover', 'visual-qa.json'), 'utf8'));
const matchers = (items = []) => items.map((item) => {
  try { const re = new RegExp(item, 'i'); return (value) => re.test(value); }
  catch { const lower = item.toLowerCase(); return (value) => value.toLowerCase().includes(lower); }
});
const matches = (value, tests) => tests.some((test) => test(value));

export function createVisualEvidenceRecorder(page, testInfo, { projectId, baseOrigin }) {
  const cfg = config();
  const root = path.resolve(process.cwd(), cfg.evidence?.directory || '.clover/artifacts/visual-qa');
  const screenshots = path.resolve(process.cwd(), cfg.evidence?.screenshotsDirectory || path.join(root, 'screenshots'));
  const receipts = path.resolve(process.cwd(), cfg.evidence?.receiptsDirectory || path.join(root, 'receipts'));
  mkdirSync(screenshots, { recursive: true });
  mkdirSync(receipts, { recursive: true });

  const ignoreConsole = matchers(cfg.console?.ignorePatterns);
  const ignoreUrls = matchers(cfg.network?.ignoreUrlPatterns);
  const ignoreTypes = new Set(cfg.network?.ignoreResourceTypes || ['media']);
  const ignoreExt = (cfg.network?.ignoreExtensions || []).map((value) => value.toLowerCase());
  const browser = testInfo.project.name;
  const errors = { console: [], page: [], requests: [] };
  const states = [];
  let finalReceipt;

  page.on('console', (message) => {
    if (message.type() === 'error' && !matches(message.text(), ignoreConsole)) errors.console.push(message.text());
  });
  page.on('pageerror', (error) => errors.page.push(error.message || String(error)));
  page.on('requestfailed', (request) => {
    let url;
    try { url = new URL(request.url()); } catch { return; }
    if (url.origin !== baseOrigin || ignoreTypes.has(request.resourceType()) || matches(request.url(), ignoreUrls)) return;
    if (ignoreExt.some((ext) => url.pathname.toLowerCase().endsWith(ext))) return;
    errors.requests.push({ method: request.method(), resourceType: request.resourceType(), url: request.url(), failure: request.failure()?.errorText || 'unknown' });
  });

  async function capture(stateId, { priority = 50 } = {}) {
    const thresholds = {
      tap: Number(cfg.checks?.tapTargetMinimumPx || 40),
      text: Number(cfg.checks?.textMinimumPx || 12)
    };
    const metrics = await page.evaluate(({ tap, text }) => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0
          && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0
          && rect.top < innerHeight && rect.left < innerWidth;
      };
      const interactive = [...document.querySelectorAll('a[href],button,input:not([type="hidden"]),select,textarea,[role="button"],[role="link"],[tabindex]:not([tabindex="-1"])')].filter(visible);
      const textNodes = [...document.querySelectorAll('p,li,a,button,label,input,textarea,select,figcaption,small')].filter(visible);
      const images = [...document.images].filter(visible);
      const root = document.documentElement;
      return {
        viewport: { width: innerWidth, height: innerHeight },
        document: { scrollWidth: root.scrollWidth, scrollHeight: root.scrollHeight, domNodeCount: document.querySelectorAll('*').length },
        horizontalOverflowPx: Math.max(0, root.scrollWidth - innerWidth),
        visibleInteractiveCount: interactive.length,
        smallTapTargetCount: interactive.filter((element) => { const r = element.getBoundingClientRect(); return r.width < tap || r.height < tap; }).length,
        smallTextElementCount: textNodes.filter((element) => parseFloat(getComputedStyle(element).fontSize) < text).length,
        visibleImageCount: images.length,
        brokenVisibleImageCount: images.filter((image) => image.complete && image.naturalWidth === 0).length,
        incompleteVisibleImageCount: images.filter((image) => !image.complete).length,
        visibleImagesMissingAltCount: images.filter((image) => !image.hasAttribute('alt') || !image.alt.trim()).length,
        headings: [...document.querySelectorAll('h1,h2,h3')].filter(visible).slice(0, 12).map((element) => ({ level: Number(element.tagName[1]), text: (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100) })),
        landmarkCounts: { header: document.querySelectorAll('header,[role="banner"]').length, nav: document.querySelectorAll('nav,[role="navigation"]').length, main: document.querySelectorAll('main,[role="main"]').length, footer: document.querySelectorAll('footer,[role="contentinfo"]').length }
      };
    }, thresholds);

    const safe = stateId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const absolute = path.join(screenshots, `${projectId}-${browser}-${safe}.jpg`);
    await page.screenshot({ path: absolute, type: 'jpeg', quality: Number(cfg.evidence?.screenshotQuality || 72), fullPage: false, animations: 'disabled', caret: 'hide', scale: 'css' });
    const bytes = readFileSync(absolute);
    states.push({
      stateId: safe,
      priority,
      route: page.url(),
      title: await page.title(),
      metrics,
      screenshot: { path: path.relative(process.cwd(), absolute).split(path.sep).join('/'), sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.byteLength, type: 'jpeg', scale: 'css' }
    });
  }

  async function finalize() {
    if (finalReceipt) return finalReceipt;
    const checks = [
      ['required-visual-state-captured', states.length > 0, `${states.length} visual state(s) captured.`],
      ['no-horizontal-overflow', states.every((state) => state.metrics.horizontalOverflowPx <= 1), `Max overflow ${Math.max(0, ...states.map((state) => state.metrics.horizontalOverflowPx))}px.`],
      ['no-visible-broken-images', states.every((state) => state.metrics.brokenVisibleImageCount === 0), `${states.reduce((sum, state) => sum + state.metrics.brokenVisibleImageCount, 0)} broken visible image(s).`],
      ['no-page-errors', errors.page.length === 0, `${errors.page.length} page error(s).`],
      ['no-unexpected-console-errors', errors.console.length === 0, `${errors.console.length} console error(s).`],
      ['no-same-origin-request-failures', errors.requests.length === 0, `${errors.requests.length} same-origin request failure(s).`]
    ].map(([id, passed, detail]) => ({ id, passed, detail }));
    finalReceipt = {
      schemaVersion: '1.0', protocol: 'Clover Visual QA v1', generatedAt: new Date().toISOString(), projectId, browser,
      overallStatus: checks.every((check) => check.passed) ? 'passed' : 'failed',
      source: { repository: process.env.GITHUB_REPOSITORY || null, branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || git('branch', '--show-current'), commit: process.env.GITHUB_SHA || git('rev-parse', 'HEAD') },
      checks, states, errors,
      advisories: {
        smallTapTargetCount: states.reduce((sum, state) => sum + state.metrics.smallTapTargetCount, 0),
        smallTextElementCount: states.reduce((sum, state) => sum + state.metrics.smallTextElementCount, 0),
        visibleImagesMissingAltCount: states.reduce((sum, state) => sum + state.metrics.visibleImagesMissingAltCount, 0),
        incompleteVisibleImageCount: states.reduce((sum, state) => sum + state.metrics.incompleteVisibleImageCount, 0)
      },
      boundaries: { productionMutationAuthorized: false, browserCredentialsAllowed: false, externalWritesAllowed: false }
    };
    writeFileSync(path.join(receipts, `${projectId}-${browser}.json`), `${JSON.stringify(finalReceipt, null, 2)}\n`);
    return finalReceipt;
  }

  return { capture, finalize };
}
