'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { extractMainContent, getPageTitle } = require('../src/extractor');
const { convertToMarkdown } = require('../src/converter');

const html = fs.readFileSync(path.join(__dirname, 'fixtures', 'forms.html'), 'utf8');
const dom = new JSDOM(html, { url: 'https://example.com/form' });
const document = dom.window.document;
document.querySelector('#name').value = '홍길동';
document.querySelector('#memo').value = '첫째 줄\n둘째 줄';
document.querySelector('#agree').checked = true;
document.querySelector('#news').checked = false;
document.querySelector('#basic').checked = false;
document.querySelector('#pro').checked = true;
document.querySelector('#city').selectedIndex = 2;
document.querySelectorAll('#skills option')[0].selected = true;
document.querySelectorAll('#skills option')[2].selected = true;
document.querySelector('#secret').value = '절대노출금지';
document.querySelector('td input').value = '김담당';

const markdown = convertToMarkdown(extractMainContent(document), {
  document,
  title: getPageTitle(document),
  url: document.location.href
});

const checks = [
  ['form content preserved', () => assert.match(markdown, /폼 안의 본문입니다/)],
  ['live text value', () => assert.match(markdown, /\*\*이름\*\*: 홍길동/)],
  ['multiline textarea', () => assert.match(markdown, /\*\*메모\*\*:\n\n```text\n첫째 줄\n둘째 줄\n```/)],
  ['checkbox states', () => {
    assert.match(markdown, /^\[x\] 동의$/m);
    assert.match(markdown, /^\[ \] 뉴스 수신$/m);
  }],
  ['radio group', () => {
    assert.match(markdown, /^\(○\) 기본형$/m);
    assert.match(markdown, /^\(●\) 프로형$/m);
  }],
  ['single select', () => {
    assert.match(markdown, /\*\*도시\*\*: 제주/);
    assert.match(markdown, /선택지: 서울 \/ 부산 \/ \*\*제주\*\*/);
  }],
  ['multiple select', () => {
    assert.match(markdown, /\*\*기술\*\*: JavaScript, HTML/);
    assert.match(markdown, /선택지: \*\*JavaScript\*\* \/ CSS \/ \*\*HTML\*\*/);
  }],
  ['password redacted', () => {
    assert.match(markdown, /\*\*비밀번호\*\*: \(입력됨\)/);
    assert.doesNotMatch(markdown, /절대노출금지/);
  }],
  ['hidden and submit omitted', () => assert.doesNotMatch(markdown, /숨은값|전송/)],
  ['table input remains inline', () => {
    assert.match(markdown, /^\| 담당자 \| \*\*담당\*\*: 김담당 \|$/m);
    assert.match(markdown, /^\|(?:\s*:?-{3,}:?\s*\|)+$/m);
  }],
  ['custom aria checkbox', () => assert.match(markdown, /^\[x\] 맞춤 알림$/m)]
];

for (const [name, check] of checks) {
  check();
  console.log(`PASS ${name}`);
}
console.log(`PASS all ${checks.length} forms checks`);
dom.window.close();
