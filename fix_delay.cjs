const fs = require('fs');
let code = fs.readFileSync('public/admin.html', 'utf8');

const target = `      let allCalculated = true;
      for (let i = 0; i < epCards.length; i++) {
        const btn = epCards[i].querySelector('button[onclick*="calculateTotalDuration"]');
        if (btn) {
           try {
             await window.calculateTotalDuration('episode', btn);
           } catch(e) {
             allCalculated = false;
           }
        }
      }`;

const replacement = `      let allCalculated = true;
      for (let i = 0; i < epCards.length; i++) {
        const btn = epCards[i].querySelector('button[onclick*="calculateTotalDuration"]');
        if (btn) {
           try {
             await window.calculateTotalDuration('episode', btn);
             // Add a delay to prevent rate-limiting from streaming servers like catbox.moe
             await new Promise(r => setTimeout(r, 1500));
           } catch(e) {
             allCalculated = false;
           }
        }
      }`;

code = code.replace(target, replacement);

const msgTarget = `if (window.showToast) window.showToast('CORS blocked real duration. Using default estimated duration.', 'info');`;
const msgReplacement = `if (window.showToast) window.showToast('Could not fetch real duration (Rate limit/Invalid Link). Using default.', 'info');`;
code = code.replace(msgTarget, msgReplacement);

fs.writeFileSync('public/admin.html', code);
