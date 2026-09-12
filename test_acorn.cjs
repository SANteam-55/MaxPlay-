const fs = require('fs');
const acorn = require('acorn');
const html = fs.readFileSync('public/admin.html', 'utf8');
const match = html.match(/<script type="module">([\s\S]*?)<\/script>/);
if (match) {
  try {
    acorn.parse(match[1], { ecmaVersion: 'latest', sourceType: 'module' });
    console.log("No syntax errors found in module!");
  } catch (e) {
    console.log("Syntax Error:", e.message, "at line", e.loc.line);
    const lines = match[1].split('\n');
    console.log(lines[e.loc.line - 1]);
  }
}
