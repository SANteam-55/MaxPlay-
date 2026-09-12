const fs = require('fs');
let content = fs.readFileSync('public/admin.html', 'utf8');

const newLogo = 'https://i.ibb.co/G4bcVYwY/Picsart-26-07-03-00-56-20-216-removebg-preview.png';

// Replace all occurrences of /logo.svg with the new URL
content = content.split('/logo.svg').join(newLogo);

fs.writeFileSync('public/admin.html', content, 'utf8');
console.log('Logo updated');
