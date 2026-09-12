const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

let fixed = html.replace(/\}\s*else if \(tabId === 'homerows'\) \{\s*if \(window\.renderHomeRows\) window\.renderHomeRows\(\);\s*\}\s*\}\;\s*\}\s*else if \(tabId === 'feedback'\) \{\s*if \(window\.loadFeedback\) window\.loadFeedback\(\);\s*\}\s*\}\;/g, 
`} else if (tabId === 'homerows') {
         if (window.renderHomeRows) window.renderHomeRows();
       } else if (tabId === 'feedback') {
         if (window.loadFeedback) window.loadFeedback();
       }
    };`);

if (fixed !== html) {
  fs.writeFileSync('public/admin.html', fixed);
  console.log('Fixed syntax error!');
} else {
  console.log('Regex did not match!');
}
