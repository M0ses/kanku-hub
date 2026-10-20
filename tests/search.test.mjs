import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Read files for structural verification
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const mainJs = fs.readFileSync(
  path.join(rootDir, '_app', 'main.js'),
  'utf8'
);
const cssContent = fs.readFileSync(
  path.join(rootDir, '_theme', 'css', 'kankuhub.css'),
  'utf8'
);
const hubJson = JSON.parse(
  fs.readFileSync(path.join(rootDir, '_kanku', 'hub.json'), 'utf8')
);

// Load all section data for live logic tests
const sectionsData = {};
for (const sec of Object.keys(hubJson.sections)) {
  const secPath = path.join(rootDir, '_kanku', 'sections', `${sec}.json`);
  if (fs.existsSync(secPath)) {
    sectionsData[sec] = JSON.parse(fs.readFileSync(secPath, 'utf8'));
  }
}

// Search helper replicating main.js logic for unit testing
function executeSearch(query, sectionFilter, hub, allData) {
  let sectionsToSearch = [];
  if (sectionFilter) {
    sectionsToSearch = [sectionFilter];
  } else {
    sectionsToSearch = Object.entries(hub.sections)
      .sort((a, b) => Number(a[1].order) - Number(b[1].order))
      .filter(entry => Number(entry[1].order) > 0)
      .map(entry => entry[0]);
  }

  const matches = [];
  const q = (query || '').toLowerCase().trim();
  const terms = q ? q.split(/\s+/) : [];

  for (const sec of sectionsToSearch) {
    const secData = allData[sec] || {};
    for (const [jobName, val] of Object.entries(secData)) {
      const jobInfo = (val && val.info) || {};
      const summary = jobInfo.summary || '';
      const desc = jobInfo.description || '';

      if (terms.length > 0) {
        const target = `${jobName} ${summary} ${desc}`.toLowerCase();
        const matched = terms.every(t => target.includes(t));
        if (!matched) {
          continue;
        }
      }
      matches.push({ name: jobName, info: jobInfo, section: sec });
    }
  }

  matches.sort((a, b) => a.name.localeCompare(b.name));
  return matches;
}

// URL builder helper replicating onSearchSubmit logic
function buildSearchUrl(pathname, query, section) {
  const params = new URLSearchParams();
  if (query) {
    params.set('q', query);
  }
  if (section) {
    params.set('section', section);
  }
  const queryString = params.toString();
  return pathname + (queryString ? `?${queryString}` : '');
}

// URL parser helper replicating main.js query string handling
function parseSearchParams(searchString) {
  const params = new URLSearchParams(searchString);
  const q = params.get('q') || params.get('query') ||
            params.get('search') || '';
  const section = params.get('section') || '';
  return { q, section };
}

describe('Navbar Search DOM Structure', () => {
  it('should include the search form in the navbar', () => {
    assert.match(indexHtml, /<form[^>]+id="searchForm"[^>]*role="search"/);
  });

  it('should include the section filter select dropdown', () => {
    assert.match(
      indexHtml,
      /<select[^>]+id="searchSection"[^>]*name="section"/
    );
    assert.match(indexHtml, /<option value="">All sections<\/option>/);
  });

  it('should include the search input and submit button', () => {
    assert.match(indexHtml, /<input[^>]+id="searchInput"/);
    assert.match(indexHtml, /<input[^>]+type="search"/);
    assert.match(indexHtml, /<input[^>]+name="q"/);
    assert.match(indexHtml, /<button[^>]+id="searchButton"/);
    assert.match(indexHtml, /<button[^>]+type="submit"/);
  });

  it('should include CSS styling for search controls', () => {
    assert.match(cssContent, /#searchForm/);
    assert.match(cssContent, /#searchForm select/);
    assert.match(cssContent, /#searchForm input\[type="search"\]/);
  });
});

describe('Search Functionality & Section Filtering', () => {
  it('should search across all sections when no section is selected', () => {
    const results = executeSearch('tumbleweed', '', hubJson, sectionsData);
    assert.ok(results.length > 0, 'Expected matches for tumbleweed');

    const sections = new Set(results.map(r => r.section));
    // Tumbleweed exists in opensuse, dki, and examples
    assert.ok(sections.has('opensuse'), 'Should include opensuse matches');
    assert.ok(sections.has('dki'), 'Should include dki matches');
    assert.ok(sections.has('examples'), 'Should include examples matches');
  });

  it('should filter jobs to only selected section when specified', () => {
    const results = executeSearch(
      'tumbleweed',
      'opensuse',
      hubJson,
      sectionsData
    );
    assert.ok(results.length > 0, 'Expected matches in opensuse');
    for (const r of results) {
      assert.equal(r.section, 'opensuse', 'All matches must be in opensuse');
    }
  });

  it('should perform case-insensitive matching', () => {
    const lower = executeSearch('leap', '', hubJson, sectionsData);
    const upper = executeSearch('LEAP', '', hubJson, sectionsData);
    assert.equal(lower.length, upper.length, 'Match count must match case');
  });

  it('should support multi-word search queries', () => {
    const results = executeSearch(
      'tumbleweed kde',
      'opensuse',
      hubJson,
      sectionsData
    );
    assert.equal(results.length, 1);
    assert.equal(results[0].name, 'tumbleweed-sdboot');
  });

  it('should match terms in descriptions', () => {
    const results = executeSearch('ssh connection', '', hubJson, sectionsData);
    assert.ok(results.length > 0, 'Expected matches based on description');
    assert.ok(results.some(r => r.section === 'dki'));
  });

  it('should return all jobs in section when query is empty', () => {
    const results = executeSearch('', 'opensuse', hubJson, sectionsData);
    assert.equal(results.length, 4);
  });

  it('should return all active jobs when query and section are empty', () => {
    const results = executeSearch('', '', hubJson, sectionsData);
    assert.ok(results.length >= 60, 'Expected all jobs across active sections');
  });
});

describe('URL Query Parameter Handling', () => {
  it('should construct query parameter when search is performed', () => {
    const url = buildSearchUrl('/index.html', 'tumbleweed', '');
    assert.equal(url, '/index.html?q=tumbleweed');
  });

  it('should include section param when section filter is selected', () => {
    const url = buildSearchUrl('/index.html', 'tumbleweed', 'opensuse');
    assert.equal(url, '/index.html?q=tumbleweed&section=opensuse');
  });

  it('should encode special characters in query parameter', () => {
    const url = buildSearchUrl('/', 'd:k:i test', 'dki');
    assert.equal(url, '/?q=d%3Ak%3Ai+test&section=dki');
  });

  it('should parse query parameters correctly', () => {
    const parsed1 = parseSearchParams('?q=leap&section=dki');
    assert.deepEqual(parsed1, { q: 'leap', section: 'dki' });

    const parsed2 = parseSearchParams('?search=tumbleweed');
    assert.deepEqual(parsed2, { q: 'tumbleweed', section: '' });

    const parsed3 = parseSearchParams('?query=micro&section=dki');
    assert.deepEqual(parsed3, { q: 'micro', section: 'dki' });
  });
});

describe('Client-Side Implementation Standards', () => {
  it('main.js should contain performSearch and onSearchSubmit', () => {
    assert.match(mainJs, /function performSearch\(/);
    assert.match(mainJs, /function onSearchSubmit\(/);
    assert.match(mainJs, /window\.history\.pushState/);
    assert.match(mainJs, /new URLSearchParams/);
  });

  it('InfoBox should prefix IDs with section to prevent collisions', () => {
    assert.match(mainJs, /selector = \(sec \? sec \+ '_' : ''\) \+ this\.name/);
  });
});
