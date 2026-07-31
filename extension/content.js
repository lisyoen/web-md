(function () {
  'use strict';

  try {
    var content = window.WebMdExtractor.extractMainContent(document);
    var title = window.WebMdExtractor.getPageTitle(document);
    var markdown = window.WebMd.convertToMarkdown(content, {
      document: document,
      title: title,
      url: location.href
    });
    var filename = window.WebMdExtractor.buildFileName(title, location, new Date());
    var objectUrl = URL.createObjectURL(new Blob([markdown], {
      type: 'text/markdown;charset=utf-8'
    }));
    var anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(function () { URL.revokeObjectURL(objectUrl); }, 1000);
  } catch (error) {
    console.error('Web Markdown 변환 실패:', error);
    alert('Markdown 변환 중 오류가 발생했습니다.');
    throw error;
  }
}());
