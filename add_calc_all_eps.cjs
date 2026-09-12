const fs = require('fs');
let code = fs.readFileSync('public/admin.html', 'utf8');

const calcAllEps = `
    window.calculateAllEpisodesDuration = async function() {
      const epCards = document.querySelectorAll('.episode-card') || document.querySelectorAll('.ep-card') || document.querySelectorAll('[class*="episode"]');
      if (!epCards || epCards.length === 0) return;
      
      let allCalculated = true;
      for (let i = 0; i < epCards.length; i++) {
        const btn = epCards[i].querySelector('button[onclick*="calculateTotalDuration"]');
        if (btn) {
           try {
             await window.calculateTotalDuration('episode', btn);
           } catch(e) {
             allCalculated = false;
           }
        }
      }
      if (allCalculated && window.showToast) {
        window.showToast("All episodes durations calculated successfully.");
      }
    };
`;

code = code.replace("window.calculateTotalDuration = async function(mode, btnElement) {", calcAllEps + "\n    window.calculateTotalDuration = async function(mode, btnElement) {");

fs.writeFileSync('public/admin.html', code);
