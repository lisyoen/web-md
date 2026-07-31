(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.WebMdExtractor = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var CANDIDATE_SELECTORS = [
    'article', 'main', '[role="main"]', '#main-content', '#content', '#main',
    '.post-content', '.article-body', '.markdown-body', '.entry-content'
  ];
  var REMOVE_SELECTORS = [
    'script', 'style', 'noscript', 'svg', 'iframe', 'form', 'button', 'nav',
    'header', 'footer', 'aside', '[role="navigation"]', '[role="banner"]',
    '[role="contentinfo"]', '[aria-hidden="true"]', '[hidden]'
  ];
  var NOISE_TOKENS = [
    'nav', 'menu', 'sidebar', 'breadcrumb', 'advert', '-ad', 'ad-', 'banner',
    'share', 'social', 'comment', 'related', 'recommend', 'popup', 'modal',
    'cookie', 'newsletter', 'skip-link'
  ];

  function normalizedText(element) {
    return ((element && element.textContent) || '').replace(/\s+/g, ' ').trim();
  }

  function scoreCandidate(element) {
    var textLength = normalizedText(element).length;
    var structuralCount = element.querySelectorAll('p, li, td, pre').length;
    var linkLength = Array.from(element.querySelectorAll('a')).reduce(function (sum, link) {
      return sum + normalizedText(link).length;
    }, 0);
    var linkRatio = textLength ? linkLength / textLength : 0;
    var noiseCount = element.querySelectorAll('nav, aside, footer').length;
    return textLength + structuralCount * 40 - linkRatio * textLength * 1.5 - noiseCount * 200;
  }

  function isNamedNoise(element) {
    var name = ((element.id || '') + ' ' + (element.className || '')).toLowerCase();
    return NOISE_TOKENS.some(function (token) { return name.includes(token); });
  }

  function cleanClone(element) {
    var clone = element.cloneNode(true);
    clone.querySelectorAll(REMOVE_SELECTORS.join(',')).forEach(function (node) {
      node.remove();
    });
    clone.querySelectorAll('*').forEach(function (node) {
      var style = node.getAttribute('style') || '';
      if (/display\s*:\s*none|visibility\s*:\s*hidden/i.test(style)) {
        node.remove();
        return;
      }
      if (isNamedNoise(node) && normalizedText(node).length < 500) node.remove();
    });
    return clone;
  }

  function extractMainContent(document) {
    if (!document || !document.body) throw new TypeError('A document with a body is required');
    var candidates = [];
    var seen = new Set();
    CANDIDATE_SELECTORS.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (element) {
        if (!seen.has(element)) {
          seen.add(element);
          candidates.push(element);
        }
      });
    });

    var best = candidates.reduce(function (winner, element) {
      var score = scoreCandidate(element);
      return !winner || score > winner.score ? { element: element, score: score } : winner;
    }, null);
    var selected = best && normalizedText(best.element).length >= 200
      ? best.element
      : document.body;
    return cleanClone(selected);
  }

  function getPageTitle(document) {
    if (!document) return '';
    var selectors = ['article h1', 'main h1', 'h1', 'meta[property="og:title"]'];
    for (var index = 0; index < selectors.length; index += 1) {
      var element = document.querySelector(selectors[index]);
      var value = element && (element.getAttribute('content') || element.textContent);
      value = String(value || '').replace(/\s+/g, ' ').trim();
      if (value) return value;
    }
    return String(document.title || '').replace(/\s+/g, ' ').trim();
  }

  function pad(number) {
    return String(number).padStart(2, '0');
  }

  function buildFileName(title, location, now) {
    var clean = String(title || '')
      .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120)
      .trim();
    if (!clean) {
      var date = now instanceof Date ? now : new Date();
      var host = (location && location.hostname) || 'webpage';
      clean = host + '-' + date.getFullYear() + pad(date.getMonth() + 1) +
        pad(date.getDate()) + '-' + pad(date.getHours()) + pad(date.getMinutes()) +
        pad(date.getSeconds());
    }
    return clean + '.md';
  }

  return {
    extractMainContent: extractMainContent,
    getPageTitle: getPageTitle,
    buildFileName: buildFileName,
    scoreCandidate: scoreCandidate
  };
}));
