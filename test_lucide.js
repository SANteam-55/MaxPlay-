const lucide = require('lucide-react');
const check = ['Sword', 'Laugh', 'Zap', 'Ghost', 'Trophy', 'Crown', 'PlayCircle', 'Clock', 'Compass', 'Globe', 'Music', 'Rocket', 'Map', 'Gamepad2', 'PlaySquare'].filter(i => !lucide[i]);
console.log("Missing:", check);
