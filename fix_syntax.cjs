const fs = require('fs');
let code = fs.readFileSync('src/screens/content/ContentDetailScreen.tsx', 'utf8');
code = code.replace(
`  // Find available languages from current active item
 = useMemo(() => {`,
`  // Find available languages from current active item
  const availableLanguages = useMemo(() => {`
);
fs.writeFileSync('src/screens/content/ContentDetailScreen.tsx', code);
