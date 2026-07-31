'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { convertToMarkdown } = require('../src/converter');
const { extractMainContent, getPageTitle } = require('../src/extractor');

const html = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample-generic.html'), 'utf8');
const dom = new JSDOM(html, { url: 'https://example.com/docs/page' });
const document = dom.window.document;
const markdown = convertToMarkdown(extractMainContent(document), {
  document,
  title: getPageTitle(document),
  url: document.location.href
});

const checks = [
  ['source header', () => assert.match(markdown, /^# 범용 문서 예제\n\n> 출처: https:\/\/example\.com\/docs\/page/)],
  ['heading', () => assert.match(markdown, /^# 범용 문서 예제$/m)],
  ['GFM table', () => {
    assert.match(markdown, /^\|.+\|$/m);
    assert.match(markdown, /^\|(?:\s*:?-{3,}:?\s*\|)+$/m);
  }],
  ['colspan padding', () => assert.match(markdown, /^\| 구분 \| \|$/m)],
  ['fenced code and language', () => assert.match(markdown, /```js\nconst answer = 42;\nconsole\.log\(answer\);\n```/)],
  ['task list checkboxes', () => {
    assert.match(markdown, /^- \[ \] 준비하기$/m);
    assert.match(markdown, /^- \[x\] 완료하기$/m);
  }],
  ['images omitted', () => {
    assert.doesNotMatch(markdown, /sample\.png|!\[/);
    assert.match(markdown, /그림 설명은 남습니다/);
  }],
  ['details included', () => {
    assert.match(markdown, /^### 추가 정보$/m);
    assert.match(markdown, /접힌 상태에서도 포함되는 상세 본문/);
  }],
  ['relative link absolute', () => assert.match(markdown, /\[시작 안내\]\(https:\/\/example\.com\/guide\/start\)/)],
  ['hash anchor text only', () => {
    assert.match(markdown, /현재 위치/);
    assert.doesNotMatch(markdown, /\[현재 위치\]\(#\)/);
  }],
  ['blank lines collapsed', () => assert.doesNotMatch(markdown, /\n{3,}/)],
  ['advertising removed by extractor', () => assert.doesNotMatch(markdown, /광고 문구/)]
];

for (const [name, check] of checks) {
  check();
  console.log(`PASS ${name}`);
}
console.log(`PASS all ${checks.length} converter checks`);
dom.window.close();
