(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('turndown'), require('turndown-plugin-gfm'));
  } else {
    root.WebMd = factory(root.TurndownService, root.turndownPluginGfm);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (TurndownService, gfmPlugin) {
  'use strict';

  var CELL_BREAK = '\uE000';
  var CODE_LANGUAGES = [
    'applescript', 'as3', 'bash', 'c', 'clojure', 'cpp', 'csharp', 'css',
    'delphi', 'diff', 'erl', 'erlang', 'groovy', 'java', 'javafx', 'js',
    'javascript', 'json', 'kotlin', 'perl', 'php', 'plain', 'plaintext',
    'powershell', 'python', 'ruby', 'rust', 'sass', 'scala', 'shell', 'sql',
    'swift', 'text', 'typescript', 'vb', 'xml', 'yaml'
  ];
  var CODE_HEADER_LANGUAGES = {
    javascript: 'js', js: 'js', bash: 'bash', shell: 'bash', python: 'python',
    java: 'java', sql: 'sql', xml: 'xml', yaml: 'yaml', json: 'json'
  };

  function replaceWithText(element, text, document) {
    element.replaceWith(document.createTextNode(text));
  }

  function isBlockElement(node) {
    return node.nodeType === 1 && ['P', 'DIV', 'UL', 'OL', 'LI', 'BR'].includes(node.tagName);
  }

  function appendCellContent(source, target, document, listType, listIndex) {
    Array.from(source.childNodes).forEach(function (node, index) {
      if (node.nodeType === 3) {
        target.appendChild(document.createTextNode(node.nodeValue.replace(/\s+/g, ' ')));
        return;
      }
      if (node.nodeType !== 1) return;
      if (node.tagName === 'BR') {
        target.appendChild(document.createTextNode(CELL_BREAK));
        return;
      }
      if (node.tagName === 'UL' || node.tagName === 'OL') {
        Array.from(node.children).filter(function (child) {
          return child.tagName === 'LI';
        }).forEach(function (item, itemIndex) {
          if (target.textContent.trim()) target.appendChild(document.createTextNode(CELL_BREAK));
          target.appendChild(document.createTextNode(node.tagName === 'OL' ? (itemIndex + 1) + '. ' : '- '));
          appendCellContent(item, target, document, node.tagName, itemIndex + 1);
        });
        return;
      }
      if (node.tagName === 'LI') {
        target.appendChild(document.createTextNode(listType === 'OL' ? listIndex + '. ' : '- '));
      }
      if (isBlockElement(node) && target.textContent.trim()) {
        target.appendChild(document.createTextNode(CELL_BREAK));
      }
      if (isBlockElement(node)) {
        appendCellContent(node, target, document, listType, listIndex);
      } else {
        var inline = node.cloneNode(false);
        target.appendChild(inline);
        appendCellContent(node, inline, document, listType, listIndex);
      }
      if (isBlockElement(node) && index < source.childNodes.length - 1 &&
          !target.textContent.endsWith(CELL_BREAK)) {
        target.appendChild(document.createTextNode(CELL_BREAK));
      }
    });
  }

  function flattenTableCell(cell, document) {
    var content = document.createDocumentFragment();
    appendCellContent(cell, content, document);
    cell.replaceChildren(content);
    var walker = document.createTreeWalker(cell, 4);
    var textNode;
    while ((textNode = walker.nextNode())) {
      textNode.nodeValue = textNode.nodeValue.replace(/\|/g, '\\|')
        .replace(new RegExp(CELL_BREAK + '+', 'g'), CELL_BREAK);
    }
  }

  function normalizeTables(root, document) {
    root.querySelectorAll('table').forEach(function (table) {
      Array.from(table.querySelectorAll('thead')).forEach(function (header) {
        if (/display\s*:\s*none/i.test(header.getAttribute('style') || '')) header.remove();
      });
      var headers = Array.from(table.querySelectorAll(':scope > thead'));
      var seenHeaders = [];
      headers.forEach(function (header) {
        var content = header.textContent.replace(/\s+/g, ' ').trim();
        if (seenHeaders.includes(content)) header.remove();
        else seenHeaders.push(content);
      });

      Array.from(table.querySelectorAll('thead, tbody, tfoot')).forEach(function (section) {
        var pending = [];
        Array.from(section.children).filter(function (child) {
          return child.tagName === 'TR';
        }).forEach(function (row) {
          var output = [];
          var column = 0;
          function addPendingCells() {
            while (pending[column] > 0) {
              output.push(document.createElement('td'));
              pending[column] -= 1;
              column += 1;
            }
          }
          Array.from(row.children).filter(function (child) {
            return child.tagName === 'TD' || child.tagName === 'TH';
          }).forEach(function (cell) {
            addPendingCells();
            flattenTableCell(cell, document);
            var colspan = Math.max(1, parseInt(cell.getAttribute('colspan') || '1', 10));
            var rowspan = Math.max(1, parseInt(cell.getAttribute('rowspan') || '1', 10));
            cell.removeAttribute('colspan');
            cell.removeAttribute('rowspan');
            output.push(cell);
            for (var offset = 0; offset < colspan; offset += 1) {
              if (rowspan > 1) pending[column + offset] = rowspan - 1;
              if (offset > 0) output.push(document.createElement(cell.tagName.toLowerCase()));
            }
            column += colspan;
          });
          addPendingCells();
          row.replaceChildren.apply(row, output);
        });
      });
    });
  }

  function languageFromElement(element) {
    var current = element;
    while (current) {
      var classes = Array.from(current.classList || []);
      for (var index = 0; index < classes.length; index += 1) {
        var match = classes[index].match(/^(?:language|lang)-([\w+-]+)$/i);
        if (match) return match[1].toLowerCase();
        if (CODE_LANGUAGES.includes(classes[index].toLowerCase())) {
          return classes[index].toLowerCase();
        }
      }
      current = current.parentElement;
      if (current && !current.matches('pre, .highlight, .hljs, [class*="syntaxhighlighter"]')) break;
    }
    return '';
  }

  function cleanCode(code) {
    var lines = String(code || '').replace(/\u00a0/g, ' ').split('\n');
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    var indent = lines.reduce(function (minimum, line) {
      if (!line.trim()) return minimum;
      var count = (line.match(/^[ \t]*/) || [''])[0].length;
      return minimum === null ? count : Math.min(minimum, count);
    }, null) || 0;
    return indent ? lines.map(function (line) { return line.slice(indent); }).join('\n') : lines.join('\n');
  }

  function normalizeCodePanels(root, document) {
    root.querySelectorAll('.code.panel, [data-macro-name="code"]').forEach(function (panel) {
      panel.querySelectorAll('.toolbar, .expand-control, .collapse-source, .linenums, .gutter, .line-number')
        .forEach(function (node) { node.remove(); });
      var highlighter = panel.querySelector('.syntaxhighlighter');
      var language = highlighter ? languageFromElement(highlighter) : '';
      if (!language) {
        var header = panel.querySelector('.codeHeader b');
        var headerText = ((header && header.textContent) || '').toLowerCase()
          .replace(/\s*-\s*collapsed\s*$/, '').trim();
        language = CODE_HEADER_LANGUAGES[headerText] || '';
      }
      var lines = Array.from(panel.querySelectorAll('.syntaxhighlighter .line'));
      var codeText = lines.length ? lines.map(function (line) {
        return line.textContent;
      }).join('\n') : ((panel.querySelector('.codeContent, pre, code') || panel).textContent || '');
      var pre = document.createElement('pre');
      var code = document.createElement('code');
      if (language) code.className = 'language-' + language;
      code.textContent = cleanCode(codeText);
      pre.appendChild(code);
      panel.replaceWith(pre);
    });
    root.querySelectorAll('pre').forEach(function (pre) {
      pre.querySelectorAll('.linenums, .gutter, .line-number').forEach(function (node) { node.remove(); });
      var code = pre.querySelector('code') || pre;
      var language = languageFromElement(code) || languageFromElement(pre);
      if (language && code !== pre) code.className = 'language-' + language;
      code.textContent = cleanCode(code.textContent);
    });
  }

  function normalizedLabelText(node) {
    return (node && node.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function labelFor(control, root, document) {
    var label = null;
    var id = control.getAttribute('id');
    if (id) {
      label = Array.from(root.querySelectorAll('label[for]')).find(function (candidate) {
        return candidate.getAttribute('for') === id;
      }) || null;
    }
    if (!label) label = control.closest('label');
    var text = '';
    if (label) {
      var labelCopy = label.cloneNode(true);
      labelCopy.querySelectorAll('input, textarea, select').forEach(function (node) { node.remove(); });
      text = normalizedLabelText(labelCopy);
    }
    if (!text) text = control.getAttribute('aria-label') || '';
    if (!text) {
      var labelledBy = (control.getAttribute('aria-labelledby') || '').trim().split(/\s+/).filter(Boolean);
      text = labelledBy.map(function (labelId) {
        return normalizedLabelText(document.getElementById(labelId));
      }).filter(Boolean).join(' ');
    }
    if (!text) text = control.getAttribute('placeholder') || control.getAttribute('title') ||
      control.getAttribute('name') || '입력';
    return { text: String(text).replace(/\s+/g, ' ').trim(), element: label };
  }

  function appendLabeledValue(target, label, value, document) {
    var strong = document.createElement('strong');
    strong.textContent = label;
    target.appendChild(strong);
    target.appendChild(document.createTextNode(': ' + value));
  }

  function formOutputElement(control, document) {
    return document.createElement(control.closest('td, th') ? 'span' : 'p');
  }

  function replaceControl(control, replacement, label) {
    if (label && label.contains(control)) label.replaceWith(replacement);
    else {
      control.replaceWith(replacement);
      if (label && label.parentNode) label.remove();
    }
  }

  function setLiteralOutput(element, text) {
    element.setAttribute('data-web-md-form-output', text);
    element.textContent = text;
  }

  function normalizeForms(root, document) {
    root.querySelectorAll('fieldset > legend').forEach(function (legend) {
      var heading = document.createElement('h3');
      heading.textContent = normalizedLabelText(legend);
      legend.replaceWith(heading);
    });

    root.querySelectorAll('input').forEach(function (input) {
      if (!input.parentNode) return;
      var type = (input.getAttribute('type') || 'text').toLowerCase();
      if (type === 'checkbox' && input.matches('li > input[type="checkbox"]')) return;
      var label = labelFor(input, root, document);
      var output = formOutputElement(input, document);
      if (['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) {
        replaceControl(input, document.createTextNode(''), label.element);
        return;
      }
      if (type === 'file') {
        var fileNames = input.getAttribute('data-web-md-files') || '';
        if (fileNames) appendLabeledValue(output, label.text, fileNames, document);
        replaceControl(input, fileNames ? output : document.createTextNode(''), label.element);
        return;
      }
      if (type === 'checkbox' || type === 'radio') {
        var checked = input.hasAttribute('checked');
        setLiteralOutput(output, type === 'checkbox'
          ? (checked ? '[x] ' : '[ ] ') + label.text
          : (checked ? '(●) ' : '(○) ') + label.text);
      } else {
        var value = input.getAttribute('value') || '';
        if (type === 'password') value = value ? '(입력됨)' : '(빈칸)';
        else if (!value) value = '(빈칸)';
        appendLabeledValue(output, label.text, value, document);
      }
      replaceControl(input, output, label.element);
    });

    root.querySelectorAll('select').forEach(function (select) {
      if (!select.parentNode) return;
      var label = labelFor(select, root, document);
      var output = formOutputElement(select, document);
      var inTable = Boolean(select.closest('td, th'));
      var options = Array.from(select.querySelectorAll('option'));
      var selected = options.filter(function (option) { return option.hasAttribute('selected'); });
      appendLabeledValue(output, label.text,
        selected.length ? selected.map(normalizedLabelText).join(', ') : '(빈칸)', document);
      if (options.length) {
        if (!inTable) output.appendChild(document.createElement('br'));
        output.appendChild(document.createTextNode(inTable ? ' / 선택지: ' : '선택지: '));
        options.forEach(function (option, index) {
          if (index) output.appendChild(document.createTextNode(' / '));
          if (option.hasAttribute('selected')) {
            var strong = document.createElement('strong');
            strong.textContent = normalizedLabelText(option);
            output.appendChild(strong);
          } else output.appendChild(document.createTextNode(normalizedLabelText(option)));
        });
      }
      replaceControl(select, output, label.element);
    });

    root.querySelectorAll('textarea').forEach(function (textarea) {
      if (!textarea.parentNode) return;
      var label = labelFor(textarea, root, document);
      var value = textarea.textContent || '';
      if (textarea.closest('td, th')) {
        var inline = document.createElement('span');
        appendLabeledValue(inline, label.text, value || '(빈칸)', document);
        replaceControl(textarea, inline, label.element);
        return;
      }
      var wrapper = document.createElement('div');
      var heading = document.createElement('p');
      appendLabeledValue(heading, label.text, '', document);
      heading.lastChild.nodeValue = ':';
      wrapper.appendChild(heading);
      if (value) {
        var pre = document.createElement('pre');
        var code = document.createElement('code');
        code.className = 'language-text';
        code.textContent = value;
        pre.appendChild(code);
        wrapper.appendChild(pre);
      } else {
        var empty = document.createElement('p');
        empty.textContent = '(빈칸)';
        wrapper.appendChild(empty);
      }
      replaceControl(textarea, wrapper, label.element);
    });

    root.querySelectorAll('[role="checkbox"], [role="switch"], [role="radio"]').forEach(function (widget) {
      var role = widget.getAttribute('role');
      var checked = widget.getAttribute('aria-checked') === 'true';
      var text = normalizedLabelText(widget) || widget.getAttribute('aria-label') || '입력';
      var output = formOutputElement(widget, document);
      setLiteralOutput(output, role === 'radio'
        ? (checked ? '(●) ' : '(○) ') + text
        : (checked ? '[x] ' : '[ ] ') + text);
      widget.replaceWith(output);
    });
    root.querySelectorAll('[role="option"][aria-selected="true"], [role="tab"][aria-selected="true"]')
      .forEach(function (option) {
        var strong = document.createElement('strong');
        strong.textContent = '선택됨';
        option.insertBefore(document.createTextNode(' '), option.firstChild);
        option.insertBefore(strong, option.firstChild);
      });
  }

  function preprocess(root, document, pageUrl) {
    root.querySelectorAll('.expand-content, .rwui_expandable_item_body, [class*="collapse"]').forEach(function (body) {
      body.classList.remove('expand-hidden', 'hidden');
      body.removeAttribute('hidden');
      body.style.display = '';
    });
    root.querySelectorAll('details').forEach(function (details) { details.open = true; });

    root.querySelectorAll(
      '.confluence-information-macro[data-macro-name="info"],' +
      '.confluence-information-macro[data-macro-name="note"],' +
      '.confluence-information-macro[data-macro-name="warning"],' +
      '.confluence-information-macro[data-macro-name="tip"]'
    ).forEach(function (macro) {
      macro.querySelectorAll('.confluence-information-macro-icon').forEach(function (icon) { icon.remove(); });
      var body = macro.querySelector('.confluence-information-macro-body') || macro;
      var blockquote = document.createElement('blockquote');
      while (body.firstChild) blockquote.appendChild(body.firstChild);
      macro.replaceWith(blockquote);
    });

    normalizeForms(root, document);
    normalizeTables(root, document);
    normalizeCodePanels(root, document);

    root.querySelectorAll('[class*="lozenge"], [class*="badge"], [class*="tag"], [class*="label"]')
      .forEach(function (status) {
        var text = status.textContent.replace(/\s+/g, ' ').trim();
        if (!text) return;
        var normalized = document.createElement('span');
        normalized.setAttribute('data-web-md-label', '');
        normalized.textContent = text;
        status.replaceWith(normalized);
      });

    root.querySelectorAll('.inline-task-list li').forEach(function (item) {
      item.setAttribute('data-web-md-task', item.getAttribute('aria-checked') === 'true' ? 'x' : ' ');
    });
    root.querySelectorAll('li').forEach(function (item) {
      var checkbox = item.querySelector(':scope > input[type="checkbox"]');
      if (!checkbox) return;
      item.setAttribute('data-web-md-task', checkbox.checked || checkbox.hasAttribute('checked') ? 'x' : ' ');
      checkbox.remove();
    });

    root.querySelectorAll('img, svg, picture, source, .plugin_attachments_container').forEach(function (node) {
      node.remove();
    });
    root.querySelectorAll(
      'a[href*="/download/attachments/"], a[data-linked-resource-type="attachment"], .confluence-embedded-file-wrapper'
    ).forEach(function (node) { node.remove(); });

    root.querySelectorAll('summary').forEach(function (summary) {
      var heading = document.createElement('h3');
      heading.textContent = summary.textContent.trim();
      summary.replaceWith(heading);
    });
    root.querySelectorAll('figcaption').forEach(function (caption) {
      var paragraph = document.createElement('p');
      paragraph.textContent = caption.textContent.trim();
      caption.replaceWith(paragraph);
    });

    root.querySelectorAll('a[href]').forEach(function (link) {
      var rawHref = (link.getAttribute('href') || '').trim();
      if (!rawHref || rawHref === '#' || /^javascript:/i.test(rawHref)) {
        replaceWithText(link, link.textContent, document);
        return;
      }
      try {
        link.setAttribute('href', new URL(rawHref, pageUrl || document.baseURI).href);
      } catch (_error) {
        replaceWithText(link, link.textContent, document);
      }
    });
  }

  function createService() {
    var service = new TurndownService({
      bulletListMarker: '-', codeBlockStyle: 'fenced', emDelimiter: '*', headingStyle: 'atx'
    });
    var gfm = gfmPlugin && (gfmPlugin.gfm || gfmPlugin);
    if (typeof gfm === 'function') service.use(gfm);
    service.addRule('taskList', {
      filter: function (node) {
        return node.nodeName === 'LI' && node.hasAttribute('data-web-md-task');
      },
      replacement: function (content, node) {
        var cleaned = content.replace(/^\s*[-*+]\s*/, '').trim();
        return '\n- [' + node.getAttribute('data-web-md-task') + '] ' + cleaned;
      }
    });
    service.addRule('formOutput', {
      filter: function (node) {
        return node.nodeType === 1 && node.hasAttribute('data-web-md-form-output');
      },
      replacement: function (_content, node) {
        var output = node.getAttribute('data-web-md-form-output');
        return node.nodeName === 'P' ? '\n\n' + output + '\n\n' : output;
      }
    });
    service.addRule('label', {
      filter: function (node) {
        return node.nodeName === 'SPAN' && node.hasAttribute('data-web-md-label');
      },
      replacement: function (content) { return '[' + content.trim() + ']'; }
    });
    return service;
  }

  function bodyToMarkdown(mainContentElement, options) {
    if (!mainContentElement || typeof mainContentElement.cloneNode !== 'function') {
      throw new TypeError('mainContentElement must be a DOM Element');
    }
    options = options || {};
    var document = options.document || mainContentElement.ownerDocument;
    var root = mainContentElement.cloneNode(true);
    preprocess(root, document, options.url);
    var markdown = createService().turndown(root)
      .replace(new RegExp(CELL_BREAK, 'g'), ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return markdown.split('\n').map(function (line) {
      return /^\|.*\|$/.test(line) ? line.replace(/\s+/g, ' ').trim() : line;
    }).join('\n');
  }

  function convertToMarkdown(mainContentElement, options) {
    options = options || {};
    var title = String(options.title || '').replace(/\s+/g, ' ').trim() || '제목 없음';
    var pageUrl = options.url || (options.document && options.document.location &&
      options.document.location.href) || '';
    var body = bodyToMarkdown(mainContentElement, {
      document: options.document,
      url: pageUrl
    });
    return ('# ' + title + '\n\n> 출처: ' + pageUrl + (body ? '\n\n' + body : '') + '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim() + '\n';
  }

  return {
    convertToMarkdown: convertToMarkdown,
    convertConfluenceHtml: bodyToMarkdown
  };
}));
