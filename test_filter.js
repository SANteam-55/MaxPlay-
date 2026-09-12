const { JSDOM } = require('jsdom');
const dom = new JSDOM(`
  <html>
    <body>
      <input type="text" id="content-selector-search" value="" />
      <div id="content-selector-list"></div>
    </body>
  </html>
`);
global.window = dom.window;
global.document = dom.window.document;

window.cachedContentDocs = [
  { id: '1', data: { title: 'Test 1', type: 'movie', posterUrl: '' } },
  { id: '2', data: { title: 123, type: 'tv', posterUrl: '' } },
  { id: 3, data: { title: 'Test 3', type: 'anime', posterUrl: '' } }
];

window.filterContentSelector = function() {
  const searchEl = document.getElementById('content-selector-search');
  const q = (searchEl ? searchEl.value || '' : '').toLowerCase();
  const list = document.getElementById('content-selector-list');
  if (!list) return;
  list.innerHTML = '';
  
  let count = 0;
  const docs = window.cachedContentDocs || [];
  docs.forEach(docItem => {
    if (!docItem || !docItem.data) return;
    const title = String(docItem.data.title || '').toLowerCase();
    const docId = String(docItem.id || '').toLowerCase();
    if(title.includes(q) || docId.includes(q)) {
      count++;
      const el = document.createElement('div');
      el.innerHTML = `Title: ${title}, ID: ${docId}`;
      list.appendChild(el);
    }
  });
  if(count === 0) {
    list.innerHTML = '<div>No matches found</div>';
  }
};

window.filterContentSelector();
console.log(document.getElementById('content-selector-list').innerHTML);
