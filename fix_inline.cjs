const fs = require('fs');
let code = fs.readFileSync('src/components/player/InlinePlayer.tsx', 'utf8');

fs.writeFileSync('src/components/player/InlinePlayer_backup.tsx', code);
