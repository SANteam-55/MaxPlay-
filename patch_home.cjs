const fs = require('fs');
let code = fs.readFileSync('src/screens/main/HomeScreen.tsx', 'utf8');

const filterOutNonCollections = `          if (row.style === 'landscape_text' || row.style === 'landscape') {
            rowContent = rowContent.filter((item: any) => item.isCollection);
          }
          if (rowContent.length === 0) return null;`;

code = code.replace(`if (rowContent.length === 0) return null;`, filterOutNonCollections);

fs.writeFileSync('src/screens/main/HomeScreen.tsx', code);
console.log("Patched HomeScreen.tsx");
