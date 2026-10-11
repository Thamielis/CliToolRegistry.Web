import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Read-only evidence for this planning package; does not generate site assets.
const root = fileURLToPath(new URL('../../../', import.meta.url));
const plansDirectory = resolve(root, 'docs/plans');
const analysis = readFileSync(resolve(plansDirectory, 'tool-explorers/analysis.md'), 'utf8');
const sourceDirectory = resolve(root, 'public/robot-docs');
const valid = [];
const ignored = [];
for (const file of readdirSync(sourceDirectory, { withFileTypes: true })) {
  if (!file.isFile() || !file.name.endsWith('.json')) continue;
  const bytes = readFileSync(resolve(sourceDirectory, file.name));
  let data;
  try {
    data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    // Only syntax/encoding failures are intentional JSON-only exclusions.
    if (!(error instanceof SyntaxError || error instanceof TypeError)) throw error;
    ignored.push(file.name);
    continue;
  }
  const digest = createHash('sha256').update(bytes).digest('hex');
  assert(analysis.includes(digest), `Analysis is stale for ${file.name}`);
  valid.push({ filename: file.name, bytes: bytes.length, sha256: digest, rootKind:
    data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data });
}
assert(valid.length > 0, 'No valid JSON inputs');

const documents = readdirSync(plansDirectory)
  .filter(name => name.startsWith('tool-explorers') && name.endsWith('.md'))
  .map(name => resolve(plansDirectory, name));
documents.push(...readdirSync(resolve(plansDirectory, 'tool-explorers'))
  .filter(name => name.endsWith('.md'))
  .map(name => resolve(plansDirectory, 'tool-explorers', name)));
for (const document of documents) {
  const content = readFileSync(document, 'utf8');
  for (const match of content.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^(?:https?:|mailto:|\/)/.test(target)) continue;
    assert(existsSync(resolve(dirname(document), target)), `Missing link: ${document} -> ${target}`);
  }
}

const tasksText = readFileSync(resolve(plansDirectory, 'tool-explorers/tasks.md'), 'utf8');
const tasks = tasksText.split(/^## /m).filter(text => /^P\d\d:/.test(text)).map(text => ({
  package: text.slice(0, 3),
  blockers: text.match(/Blockiert durch: ([^.]+)/)[1].match(/P\d\d/g) ?? [],
  files: [...text.split('Dateiverantwortung:\n\n')[1]
    .split('\n\nVerbindlicher')[0].matchAll(/`([^`]+)`/g)].map(match => match[1]),
}));
const exported = readFileSync(resolve(root, '.beads/issues.jsonl'), 'utf8')
  .split('\n').filter(Boolean).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`Invalid tracker JSONL record ${index + 1}`, { cause: error });
    }
  });
const issues = tasks.map(task => {
  const matches = exported.filter(issue => issue.title.startsWith(task.package + ':')
    && issue.labels?.includes('tool-explorers'));
  assert.equal(matches.length, 1, `Missing/duplicate bead ${task.package}`);
  return { ...task, issue: matches[0] };
});
const byId = new Map(issues.map(task => [task.issue.id, task]));
const byPackage = new Map(issues.map(task => [task.package, task]));
for (const task of issues) {
  const actual = (task.issue.dependencies ?? []).filter(edge => edge.type === 'blocks')
    .map(edge => edge.depends_on_id).sort();
  const expected = task.blockers.map(name => {
    assert(byPackage.has(name), `Unknown blocker ${name}`);
    return byPackage.get(name).issue.id;
  }).sort();
  assert.deepEqual(actual, expected, `Dependency drift ${task.package}`);
}
function ancestors(task, path = new Set()) {
  assert(!path.has(task.package), `Cycle at ${task.package}`);
  const result = new Set();
  const nextPath = new Set(path).add(task.package);
  for (const blocker of task.blockers) {
    const parent = byPackage.get(blocker);
    result.add(parent.package);
    for (const inherited of ancestors(parent, nextPath)) result.add(inherited);
  }
  return result;
}
for (let left = 0; left < issues.length; left++) {
  for (let right = left + 1; right < issues.length; right++) {
    const first = issues[left], second = issues[right];
    if (ancestors(first).has(second.package) || ancestors(second).has(first.package)) continue;
    const overlap = first.files.filter(file => second.files.includes(file));
    assert.equal(overlap.length, 0, `Parallel file conflict ${first.package}/${second.package}: ${overlap}`);
  }
}
const ready = issues.filter(task => task.issue.status === 'open' && task.blockers.every(name =>
  byPackage.get(name).issue.status === 'closed')).map(task => task.issue.id);
console.log(JSON.stringify({
  validSources: valid.length,
  ignoredSources: ignored,
  sourceHashesMatchAnalysis: true,
  checkedPlanDocuments: documents.length,
  beads: byId.size,
  blockerEdges: issues.reduce((total, task) => total + task.blockers.length, 0),
  cycles: false,
  parallelFileConflicts: false,
  ready,
}, null, 2));
