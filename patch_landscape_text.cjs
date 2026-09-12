const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

const oldOpenMulti = `window.openMultiContentSelector = function(rowId) {
      const rows = window.hotScreensData[window.activeHotScreen] || [];
      const row = rows.find(r => r.id === rowId);
      const actionBar = document.getElementById('multi-content-selector-action-bar');
      if (actionBar) {
        if (row && row.style === 'classic_anime') {
          actionBar.style.display = 'flex';
        } else {
          actionBar.style.display = 'none';
        }
      }`;

const newOpenMulti = `window.openMultiContentSelector = function(rowId) {
      const rows = window.hotScreensData[window.activeHotScreen] || [];
      const row = rows.find(r => r.id === rowId);
      const actionBar = document.getElementById('multi-content-selector-action-bar');
      if (actionBar) {
        if (row && (row.style === 'classic_anime' || row.style === 'landscape_text' || row.style === 'landscape')) {
          actionBar.style.display = 'flex';
          const textSpan = actionBar.querySelector('span');
          if (textSpan) {
             textSpan.textContent = row.style === 'classic_anime' ? 'Classic Portrait Layout - You can group multiple items into a single card' : 'Landscape Text Layout - Requires Collection Cards';
          }
        } else {
          actionBar.style.display = 'none';
        }
      }`;

html = html.replace(oldOpenMulti, newOpenMulti);

const oldRenderMulti = `docs.forEach(docItem => {
        if (!docItem || !docItem.data) return;`;

const newRenderMulti = `
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

html = html.replace(oldRenderMulti, newRenderMulti);

fs.writeFileSync('public/admin.html', html);
console.log("Patched admin.html for landscape_text modal");
