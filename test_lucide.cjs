const lucide = require('lucide-react');
const check = ['Tv', 'Clapperboard', 'Swords', 'Smile', 'Heart', 'Zap', 'Star', 'Trophy', 'Crown', 'Clock', 'Compass', 'Rocket', 'PlaySquare'].filter(i => !lucide[i]);
console.log("Missing:", check);
