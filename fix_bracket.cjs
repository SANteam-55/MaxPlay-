const fs = require('fs');
let code = fs.readFileSync('src/screens/main/HomeScreen.tsx', 'utf8');

code = code.replace("} } else if (style === 'landscape_text') {", "} else if (style === 'landscape_text') {");

fs.writeFileSync('src/screens/main/HomeScreen.tsx', code);
console.log("Fixed bracket!");
