'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const {
  extractMainContent,
  getPageTitle,
  buildFileName
} = require('../src/extractor');

function domFrom(html, url = 'https://example.com/page') {
  return new JSDOM(html, { url });
}

const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample-generic.html'), 'utf8');
const checks = [
  ['semantic candidate selection', () => {
    const dom = domFrom(fixture);
    const result = extractMainContent(dom.window.document);
    assert.match(result.textContent, /범용 문서 예제/);
    assert.doesNotMatch(result.textContent, /사이트 머리글/);
    dom.window.close();
  }],
  ['scoring selects content over sidebar', () => {
    const dom = domFrom(`<body><main><aside>${'링크 '.repeat(20)}</aside></main>
      <article><h1>본문</h1><p>${'밀도 높은 본문 문장 '.repeat(30)}</p></article></body>`);
    assert.match(extractMainContent(dom.window.document).textContent, /밀도 높은 본문/);
    dom.window.close();
  }],
  ['body fallback', () => {
    const html = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample-nosemantic.html'), 'utf8');
    const dom = domFrom(html);
    const result = extractMainContent(dom.window.document);
    assert.match(result.textContent, /시맨틱 태그가 없는/);
    assert.doesNotMatch(result.textContent, /쿠키 안내/);
    dom.window.close();
  }],
  ['noise tags removed', () => {
    const dom = domFrom(`<body><article><p>${'본문 '.repeat(80)}</p><nav>탐색</nav><footer>바닥</footer>
      <script>secret()</script></article></body>`);
    const result = extractMainContent(dom.window.document);
    assert.strictEqual(result.querySelectorAll('nav, footer, script').length, 0);
    dom.window.close();
  }],
  ['advertising class removed', () => {
    const dom = domFrom(`<body><article><p>${'본문 '.repeat(80)}</p><div class="advert-card">광고</div></article></body>`);
    assert.doesNotMatch(extractMainContent(dom.window.document).textContent, /광고/);
    dom.window.close();
  }],
  ['long named element preserved', () => {
    const longText = '보존할 내용 '.repeat(100);
    const dom = domFrom(`<body><article><p>${'본문 '.repeat(80)}</p><div class="related-story">${longText}</div></article></body>`);
    assert.match(extractMainContent(dom.window.document).textContent, /보존할 내용/);
    dom.window.close();
  }],
  ['title priority', () => {
    const dom = domFrom('<title>문서</title><meta property="og:title" content="공유"><main><h1>메인</h1></main><article><h1>기사</h1></article>');
    assert.strictEqual(getPageTitle(dom.window.document), '기사');
    dom.window.close();
  }],
  ['filename cleanup and fallback', () => {
    const location = { hostname: 'example.com' };
    assert.strictEqual(buildFileName('  나쁜 / 파일 : 이름  ', location), '나쁜 파일 이름.md');
    assert.strictEqual(
      buildFileName('***', location, new Date(2026, 6, 31, 9, 8, 7)),
      'example.com-20260731-090807.md'
    );
  }]
];

for (const [name, check] of checks) {
  check();
  console.log(`PASS ${name}`);
}
console.log(`PASS all ${checks.length} extractor checks`);
