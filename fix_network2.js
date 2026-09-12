const fs = require('fs');
let code = fs.readFileSync('src/screens/content/NetworkDetailScreen.tsx', 'utf8');

code = code.replace("const bannerUrl = network.bannerUrl || network.logoUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200';",
"const bannerUrl = network.bannerUrl || network.logoUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200';\n  const glowColor = palette ? palette.primary : '#8B5CF6';");

code = code.replace('<header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-[#0A0A0E]/90 backdrop-blur-xl border-b border-white/10 shadow-lg">',
'<header className="flex-none flex items-center justify-between px-4 py-3 bg-[#0A0A0E]/90 backdrop-blur-xl border-b border-white/10 shadow-lg z-50">');

code = code.replace("  );\n};\n", "          </div>\n        )}\n      </div>\n    </main>\n  </div>\n);\n};");

// Wait, I messed up the closing tags in chunk 7?
// Let's just fix the ending tags manually because of the wrapper div added in chunk 6.
