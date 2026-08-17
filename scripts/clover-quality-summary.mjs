import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const git = (...args) => { const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null; };
const glob = (pattern) => new RegExp(`^${pattern.replace(/[|\\{}()[\]^$+?.]/g, '\\$&').replaceAll('**/', '(?:.*/)?').replaceAll('**', '.*').replaceAll('*', '[^/]*')}$`);
const matches = (file, patterns = []) => patterns.some((pattern) => glob(pattern).test(file));
const html = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function select(states, browsers, limit) {
  const sorted = [...states].sort((a, b) => b.priority - a.priority || `${a.browser}:${a.stateId}`.localeCompare(`${b.browser}:${b.stateId}`));
  const chosen = [], paths = new Set();
  for (const browser of browsers) {
    const state = sorted.find((item) => item.browser === browser && !paths.has(item.screenshot.path));
    if (state) { chosen.push(state); paths.add(state.screenshot.path); }
  }
  for (const state of sorted) {
    if (chosen.length >= limit) break;
    if (!paths.has(state.screenshot.path)) { chosen.push(state); paths.add(state.screenshot.path); }
  }
  return chosen.slice(0, limit);
}

const configPath = path.join(root, '.clover', 'visual-qa.json');
if (!existsSync(configPath)) throw new Error('Missing .clover/visual-qa.json');
const config = read(configPath);
const output = path.resolve(root, config.evidence?.directory || '.clover/artifacts/visual-qa');
const receiptDir = path.resolve(root, config.evidence?.receiptsDirectory || path.join(output, 'receipts'));
mkdirSync(output, { recursive: true });
if (!existsSync(receiptDir)) throw new Error('Missing visual QA receipts.');
const files = readdirSync(receiptDir).filter((name) => name.endsWith('.json')).sort();
if (!files.length) throw new Error('No visual QA receipts were produced.');
const receipts = files.map((name) => read(path.join(receiptDir, name)));
const commit = git('rev-parse', 'HEAD');
const productionBranch = config.project?.productionBranch || 'main';
const baseRef = `origin/${productionBranch}`;
const baseCommit = git('merge-base', baseRef, 'HEAD') || git('rev-parse', baseRef);
const diff = baseCommit ? git('diff', '--name-only', `${baseCommit}...HEAD`) : '';
const changedFiles = diff ? diff.split('\n').filter(Boolean).sort() : [];
const requiredBrowsers = config.browsers?.requiredProjects || ['desktop-chromium', 'mobile-webkit'];
const observedBrowsers = [...new Set(receipts.map((receipt) => receipt.browser))].sort();
const missingBrowsers = requiredBrowsers.filter((browser) => !observedBrowsers.includes(browser));
const stale = commit ? receipts.filter((receipt) => receipt.source?.commit && receipt.source.commit !== commit) : [];
const states = receipts.flatMap((receipt) => (receipt.states || []).map((state) => ({ ...state, browser: receipt.browser })));
const failedChecks = receipts.flatMap((receipt) => (receipt.checks || []).filter((check) => !check.passed).map((check) => ({ browser: receipt.browser, ...check })));
const deterministicPassed = receipts.every((receipt) => receipt.overallStatus === 'passed') && !failedChecks.length && !missingBrowsers.length && !stale.length;
const visualChangeDetected = changedFiles.some((file) => matches(file, config.review?.uiPathPatterns));
const firstCapture = config.review?.baselineStatus !== 'approved' && config.review?.requireModelReviewOnFirstCapture !== false;
const forceEnv = config.review?.forceReviewEnv || 'CLOVER_FORCE_MODEL_REVIEW';
const reasons = [];
if (process.env[forceEnv] === '1') reasons.push(`${forceEnv}=1`);
if (firstCapture) reasons.push('visual baseline has not been owner-approved');
if (visualChangeDetected) reasons.push('UI-affecting source paths changed');
const reviewRequired = reasons.length > 0;
const budget = Math.max(1, Number(config.evidence?.maxModelReviewScreenshots || 4));
const selectedScreenshots = select(states, requiredBrowsers, budget).map((state) => ({ browser: state.browser, stateId: state.stateId, priority: state.priority, path: state.screenshot.path, sha256: state.screenshot.sha256, viewport: state.metrics?.viewport || null, route: state.route, title: state.title }));
const advisories = receipts.reduce((sum, receipt) => {
  for (const key of Object.keys(sum)) sum[key] += receipt.advisories?.[key] || 0;
  return sum;
}, { smallTapTargetCount: 0, smallTextElementCount: 0, visibleImagesMissingAltCount: 0, incompleteVisibleImageCount: 0 });
const generatedAt = new Date().toISOString();
const summary = {
  schemaVersion: '1.0', protocol: 'Clover Visual QA v1', generatedAt, project: config.project,
  source: { branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || git('branch', '--show-current'), commit, productionBranch, baseCommit, changedFiles, visualChangeDetected },
  deterministic: { status: deterministicPassed ? 'passed' : 'failed', requiredBrowsers, observedBrowsers, missingBrowsers, receiptCount: receipts.length, stateCount: states.length, failedChecks, staleReceiptCount: stale.length, advisories },
  boundedModelReview: { required: reviewRequired, reasons, screenshotBudget: budget, selectedScreenshots, inputPolicy: 'Review only this summary and the selected screenshots first; open traces or more images only for a concrete defect.' },
  release: { state: 'not-authorized', ownerApprovalRequired: true, productionEligible: false, deterministicPreviewCandidateEligible: deterministicPassed, ownerVisualReviewState: reviewRequired ? 'pending' : 'not-required-for-this-change' },
  boundaries: { productionMutationAuthorized: false, productionDeploymentAuthorized: false, productionAliasOrDomainChangeAuthorized: false, productionDataMutationAuthorized: false, secretMutationAuthorized: false, browserCredentialsAllowed: false, externalWritesAllowed: false }
};
const queue = { schemaVersion: '1.0', protocol: 'Clover Bounded Model Review Queue v1', generatedAt, projectId: config.project?.id || null, deterministicStatus: summary.deterministic.status, reviewRequired, reasons, maxScreenshots: budget, screenshots: selectedScreenshots, instructions: ['Inspect only the listed screenshots and this queue on the first pass.', 'Evaluate hierarchy, spacing, readability, clipping, affordance, and state clarity.', 'Do not authorize production or external writes.', 'Tie each finding to a screenshot path/state and encode accepted findings into deterministic checks when practical.'] };
writeFileSync(path.join(output, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
writeFileSync(path.join(output, 'model-review-queue.json'), `${JSON.stringify(queue, null, 2)}\n`);
writeFileSync(path.join(output, 'summary.md'), `# ${config.project?.title || config.project?.id} visual QA\n\n- Deterministic: **${summary.deterministic.status}**\n- Browsers: ${observedBrowsers.join(', ') || 'none'}\n- States: ${states.length}\n- Bounded model review: **${reviewRequired ? 'required' : 'not required'}**\n- Screenshot budget: ${selectedScreenshots.length}/${budget}\n- Release: **not authorized**\n`);
const cards = states.map((state) => `<article><img src="${html(path.relative(output, path.resolve(root, state.screenshot.path)).split(path.sep).join('/'))}" alt="${html(`${state.browser} ${state.stateId}`)}"><h2>${html(state.stateId)}</h2><p>${html(state.browser)} · ${state.metrics?.viewport?.width || '?'}×${state.metrics?.viewport?.height || '?'}</p><p>Overflow ${state.metrics?.horizontalOverflowPx || 0}px · broken images ${state.metrics?.brokenVisibleImageCount || 0}</p></article>`).join('');
writeFileSync(path.join(output, 'report.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${html(config.project?.title)} visual QA</title><style>body{font:15px system-ui;margin:0;padding:24px;background:#edf3ee;color:#152019}main{max-width:1200px;margin:auto}header,article{background:white;border:1px solid #cdd8cf;border-radius:16px;overflow:hidden}header{padding:20px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:16px}img{width:100%;display:block}h2,p{margin:10px 14px}</style><main><header><h1>${html(config.project?.title)} visual QA</h1><p>Deterministic <strong>${summary.deterministic.status}</strong>; bounded review <strong>${reviewRequired ? 'required' : 'not required'}</strong>; production <strong>not authorized</strong>.</p></header><section class="grid">${cards}</section></main>`);
console.log(`Clover Visual QA: ${summary.deterministic.status}; model review ${reviewRequired ? 'required' : 'not required'}; ${selectedScreenshots.length} screenshot(s) queued.`);
process.exit(deterministicPassed ? 0 : 1);
