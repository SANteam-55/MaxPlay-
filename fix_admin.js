const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// The problematic snippet is:
//        }    };         } else if (tabId === 'feedback') { if (window.loadFeedback) window.loadFeedback(); }    };
// Let's replace it with the correct structure.

const badSnippet = `       } else if (tabId === 'homerows') {
         if (window.renderHomeRows) window.renderHomeRows();
       }
    };
         } else if (tabId === 'feedback') { if (window.loadFeedback) window.loadFeedback(); }
    };`;

const correctSnippet = `       } else if (tabId === 'homerows') {
         if (window.renderHomeRows) window.renderHomeRows();
       } else if (tabId === 'feedback') {
         if (window.loadFeedback) window.loadFeedback();
       }
    };`;

// Note: spacing might be tricky. Let's just use regex to fix it.
html = html.replace(/\}\s*else if \(tabId === 'homerows'\) \{\s*if \(window\.renderHomeRows\) window\.renderHomeRows\(\);\s*\}\s*\}\;\s*\}\s*else if \(tabId === 'feedback'\) \{\s*if \(window\.loadFeedback\) window\.loadFeedback\(\);\s*\}\s*\}\;/g, 
`} else if (tabId === 'homerows') {
         if (window.renderHomeRows) window.renderHomeRows();
       } else if (tabId === 'feedback') {
         if (window.loadFeedback) window.loadFeedback();
       }
    };`);

fs.writeFileSync('public/admin.html', html);
console.log('Fixed syntax error!');
