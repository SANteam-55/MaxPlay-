const fs = require('fs');
let code = fs.readFileSync('src/screens/content/ContentDetailScreen.tsx', 'utf8');
fs.writeFileSync('src/screens/content/ContentDetailScreen_backup.tsx', code);
