const fs = require('fs');
let code = fs.readFileSync('src/screens/content/NetworkDetailScreen.tsx', 'utf8');

// 1. Add colorExtractor import
if (!code.includes('extractAmbientPalette')) {
  code = code.replace("import { ContentCard } from '../../components/common/ContentCard';",
    "import { ContentCard } from '../../components/common/ContentCard';\nimport { extractAmbientPalette, AmbientColorPalette } from '../../utils/colorExtractor';");
}

// 2. Add state for palette and useEffect
if (!code.includes('const [palette, setPalette]')) {
  code = code.replace('const [showSearch, setShowSearch] = useState(false);',
    `const [showSearch, setShowSearch] = useState(false);\n  const [palette, setPalette] = useState<AmbientColorPalette | null>(null);\n\n  React.useEffect(() => {\n    if (network.logoUrl || network.bannerUrl) {\n      extractAmbientPalette(network.logoUrl || network.bannerUrl || '').then(setPalette);\n    }\n  }, [network.logoUrl, network.bannerUrl]);`);
}

// 3. Update glow color
code = code.replace("shadow-[0_8px_30px_rgba(139,92,246,0.3)]", "shadow-[0_8px_30px_rgba(var(--glow-color),0.4)]");
code = code.replace("from-[#8B5CF6] to-[#06B6D4]", "from-[rgba(var(--glow-color),1)] to-[#06B6D4]");

// Wait, standardizing the color variables is easier:
code = code.replace("return (", `  const glowColor = palette ? palette.primary : '#8B5CF6';\n  return (`);

// Let's just do a proper replace using edit_file instead.
