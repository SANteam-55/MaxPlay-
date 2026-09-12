const fs = require('fs');
let content = fs.readFileSync('public/admin.html', 'utf8');

const editContentStart = content.indexOf('window.editContent = function(id) {');
const onTypeDropdownStr = "onTypeDropdownChange(item.type || 'movie');";

const insertPoint = content.indexOf(onTypeDropdownStr, editContentStart) + onTypeDropdownStr.length;

const injectCode = `
      // Load available languages
      window.activeLanguages = (item.availableLanguages && item.availableLanguages.length > 0) ? item.availableLanguages : ['English'];
      document.querySelectorAll('.lang-checkbox').forEach(cb => {
        cb.checked = window.activeLanguages.includes(cb.value);
      });
`;

content = content.substring(0, insertPoint) + injectCode + content.substring(insertPoint);
fs.writeFileSync('public/admin.html', content);
