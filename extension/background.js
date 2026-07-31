'use strict';

var INJECTABLE_PROTOCOLS = ['http:', 'https:', 'file:'];
var BLOCKED_WEB_STORE_HOSTS = ['chromewebstore.google.com', 'chrome.google.com'];

function showFailure(tabId, message) {
  console.error('Web Markdown:', message);
  chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: '#d93025' });
  chrome.action.setBadgeText({ tabId: tabId, text: '!' });
  chrome.action.setTitle({ tabId: tabId, title: message });
  setTimeout(function () {
    chrome.action.setBadgeText({ tabId: tabId, text: '' });
    chrome.action.setTitle({ tabId: tabId, title: 'Markdown으로 다운로드' });
  }, 3000);
}

function canInject(rawUrl) {
  try {
    var url = new URL(rawUrl);
    return INJECTABLE_PROTOCOLS.includes(url.protocol) &&
      !BLOCKED_WEB_STORE_HOSTS.includes(url.hostname);
  } catch (_error) {
    return false;
  }
}

chrome.action.onClicked.addListener(async function (tab) {
  if (!tab.id) return;
  if (!canInject(tab.url || '')) {
    showFailure(tab.id, '이 페이지에서는 확장을 실행할 수 없습니다.');
    return;
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [
        'lib/turndown.js',
        'lib/turndown-plugin-gfm.js',
        'lib/extractor.js',
        'lib/converter.js',
        'content.js'
      ]
    });
  } catch (error) {
    showFailure(tab.id, '페이지 내용을 Markdown으로 변환하지 못했습니다.');
    console.error(error);
  }
});
