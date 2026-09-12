const fs = require('fs');
let code = fs.readFileSync('src/screens/main/HomeScreen.tsx', 'utf8');

code = code.replace(
  `if (row.style === 'landscape_text' || row.style === 'landscape') {`,
  `if (row.style === 'landscape_text' || row.style === 'landscape' || row.style === 'seasonal_card') {`
);

fs.writeFileSync('src/screens/main/HomeScreen.tsx', code);
console.log("Patched HomeScreen.tsx filter logic");
