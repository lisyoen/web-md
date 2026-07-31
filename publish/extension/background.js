'use strict';

importScripts('lib/version.js');

var UPDATE_URL = 'https://raw.githubusercontent.com/lisyoen/web-md/main/publish/latest.json';
var RELEASE_NOTES_URL = 'https://github.com/lisyoen/web-md/releases';
var NATIVE_HOST = 'com.lisyoen.web_md_updater';
var DEFAULT_TITLE = 'Markdown으로 다운로드';
var UPDATE_ALARM = 'update-check';
var INJECTABLE_PROTOCOLS = ['http:', 'https:', 'file:'];
var BLOCKED_WEB_STORE_HOSTS = ['chromewebstore.google.com', 'chrome.google.com'];

function notify(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Web Markdown',
    message: message
  });
}

async function checkForUpdate() {
  try {
    var response = await fetch(UPDATE_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    var remote = await response.json();
    await chrome.storage.local.set({
      latestVersion: remote.version,
      checkedAt: new Date().toISOString()
    });

    if (WebMdVersion.compareVersions(
      remote.version,
      chrome.runtime.getManifest().version
    ) > 0) {
      chrome.action.setBadgeText({ text: 'NEW' });
      chrome.action.setBadgeBackgroundColor({ color: '#1a73e8' });
      chrome.action.setTitle({
        title: DEFAULT_TITLE + ' — 새 버전 v' + remote.version + ' 배포됨'
      });
      return;
    }

    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: DEFAULT_TITLE });
  } catch (error) {
    console.warn('Web Markdown 업데이트 확인 실패:', error);
  }
}

function registerMenus() {
  chrome.contextMenus.removeAll(function () {
    chrome.contextMenus.create({
      id: 'update-now',
      title: '업데이트 확인 및 적용',
      contexts: ['action']
    });
    chrome.contextMenus.create({
      id: 'release-notes',
      title: '릴리즈노트 보기',
      contexts: ['action']
    });
  });
}

function startUpdateChecks() {
  checkForUpdate();
  chrome.alarms.create(UPDATE_ALARM, { periodInMinutes: 360 });
}

chrome.runtime.onInstalled.addListener(function () {
  registerMenus();
  startUpdateChecks();
});

chrome.runtime.onStartup.addListener(function () {
  registerMenus();
  startUpdateChecks();
});

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === UPDATE_ALARM) checkForUpdate();
});

chrome.contextMenus.onClicked.addListener(function (info) {
  if (info.menuItemId === 'release-notes') {
    chrome.tabs.create({ url: RELEASE_NOTES_URL });
    return;
  }
  if (info.menuItemId !== 'update-now') return;

  chrome.runtime.sendNativeMessage(
    NATIVE_HOST,
    { action: 'update' },
    function (response) {
      if (chrome.runtime.lastError) {
        notify(
          '업데이트 헬퍼를 실행할 수 없습니다. updater\\install-updater.bat을 먼저 실행해 주세요.'
        );
        return;
      }
      if (!response || !response.ok) {
        var summary = response && response.message
          ? String(response.message).slice(-300)
          : '응답이 없습니다.';
        notify('업데이트 실패: ' + summary);
        return;
      }
      if (response.upToDate) {
        notify('이미 최신 버전입니다.');
        checkForUpdate();
        return;
      }

      notify(
        '업데이트를 받았습니다. chrome://extensions 에서 새로고침하면 적용됩니다.'
      );
      chrome.action.setBadgeText({ text: 'OK' });
      chrome.action.setBadgeBackgroundColor({ color: '#188038' });
      setTimeout(function () {
        chrome.action.setBadgeText({ text: '' });
        checkForUpdate();
      }, 3000);
    }
  );
});

function showFailure(tabId, message) {
  console.error('Web Markdown:', message);
  chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: '#d93025' });
  chrome.action.setBadgeText({ tabId: tabId, text: '!' });
  chrome.action.setTitle({ tabId: tabId, title: message });
  setTimeout(function () {
    chrome.action.setBadgeText({ tabId: tabId, text: '' });
    chrome.action.setTitle({ tabId: tabId, title: DEFAULT_TITLE });
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
