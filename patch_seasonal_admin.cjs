const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// Update window.openMultiContentSelector
const oldOpenMulti = `row.style === 'classic_anime' || row.style === 'landscape_text' || row.style === 'landscape'`;
const newOpenMulti = `row.style === 'classic_anime' || row.style === 'landscape_text' || row.style === 'landscape' || row.style === 'seasonal_card'`;
html = html.replace(oldOpenMulti, newOpenMulti);
html = html.replace(oldOpenMulti, newOpenMulti); // replace twice if needed

const oldTextSpan = `textSpan.textContent = row.style === 'classic_anime' ? 'Classic Portrait Layout - You can group multiple items into a single card' : 'Landscape Text Layout - Requires Collection Cards';`;
const newTextSpan = `textSpan.textContent = row.style === 'classic_anime' ? 'Classic Portrait Layout - You can group multiple items into a single card' : (row.style === 'seasonal_card' ? 'Seasonal Wide Card - Requires Collection Cards' : 'Landscape Text Layout - Requires Collection Cards');`;
html = html.replace(oldTextSpan, newTextSpan);


// Update window.renderMultiContentSelector
const oldRenderMultiIf = `if (row && (row.style === 'landscape_text' || row.style === 'landscape')) {`;
const newRenderMultiIf = `if (row && (row.style === 'landscape_text' || row.style === 'landscape' || row.style === 'seasonal_card')) {`;
html = html.replace(oldRenderMultiIf, newRenderMultiIf);

fs.writeFileSync('public/admin.html', html);
console.log("Patched admin.html for seasonal_card modal");
