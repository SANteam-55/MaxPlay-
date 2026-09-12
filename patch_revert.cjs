const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// Revert the wrong replacement
const wrongCode = `      if (row && (row.style === 'landscape_text' || row.style === 'landscape')) {
        list.innerHTML = \`<div style="grid-column:1/-1; padding:40px; text-align:center; color:var(--text-tertiary);">
          <i class="fa-solid fa-layer-group" style="font-size:36px; margin-bottom:16px; opacity:0.5;"></i>
          <h4 style="font-size:16px; font-weight:700; color:#FFF; margin-bottom:8px;">Collections Only</h4>
          <p style="font-size:13px; max-width:400px; margin:0 auto;">This layout only supports Collection Cards. Please use the 'Create Collection Card' button above to add items to this row.</p>
        </div>\`;
        return;
      }
      
      docs.forEach(docItem => {
        if (!docItem || !docItem.data) return;`;

html = html.replace(wrongCode, `docs.forEach(docItem => {
        if (!docItem || !docItem.data) return;`);

// Apply correctly to renderMultiContentSelector
const multiRenderSearch = `let count = 0;
      const docs = window.cachedContentDocs || [];
      docs.forEach(docItem => {
        if (!docItem || !docItem.data) return;`;

const multiRenderReplace = `let count = 0;
      const docs = window.cachedContentDocs || [];
      
      if (row && (row.style === 'landscape_text' || row.style === 'landscape')) {
        list.innerHTML = \`<div style="grid-column:1/-1; padding:40px; text-align:center; color:var(--text-tertiary);">
          <i class="fa-solid fa-layer-group" style="font-size:36px; margin-bottom:16px; opacity:0.5;"></i>
          <h4 style="font-size:16px; font-weight:700; color:#FFF; margin-bottom:8px;">Collections Only</h4>
          <p style="font-size:13px; max-width:400px; margin:0 auto;">This layout only supports Collection Cards. Please use the 'Create Collection Card' button above to add items to this row.</p>
        </div>\`;
        return;
      }
      
      docs.forEach(docItem => {
        if (!docItem || !docItem.data) return;`;

html = html.replace(multiRenderSearch, multiRenderReplace);

fs.writeFileSync('public/admin.html', html);
console.log("Reverted wrong patch and applied to correct function.");
