const fs = require('fs');
const html = fs.readFileSync('public/admin.html', 'utf8');
const match = html.match(/<script type="module">([\s\S]*?)<\/script>/);
let code = match[1];
// Mock imports
code = code.replace(/import\s+{([^}]+)}\s+from\s+['"][^'"]+['"];/g, (m, p1) => {
  return `const { ${p1.split(',').map(s => s.trim().split(' as ')[0]).join(', ')} } = new Proxy({}, { get: () => () => {} });`;
});
code = code.replace(/await import\([^)]+\)/g, 'new Proxy({}, { get: () => () => {} })');
try {
  const windowMock = { addEventListener: () => {}, switchTab: () => {} };
  const documentMock = { getElementById: () => ({ style: {} }), querySelectorAll: () => [] };
  new Function('window', 'document', 'setTimeout', 'console', code)(windowMock, documentMock, () => {}, console);
  console.log("Evaluation succeeded!");
} catch (e) {
  console.log("Evaluation failed:", e.stack);
}
