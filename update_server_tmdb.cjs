const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const tmdbInjection = `
      let enhancedContext = { ...(context || {}) };
      const TMDB_API_KEY = process.env.TMDB_API_KEY;

      if (TMDB_API_KEY && TMDB_API_KEY !== "paste_your_api_key_here") {
        try {
           const extractorResp = await ai.models.generateContent({
             model: "gemini-3.5-flash",
             contents: \`Extract ONLY the exact movie or series title from this admin command. Return nothing else. If none is found, reply with "NONE". Command: "\${prompt.trim()}"\`,
             config: { temperature: 0.1 }
           });
           const extractedTitle = extractorResp.text ? extractorResp.text.trim() : "NONE";

           if (extractedTitle && extractedTitle !== "NONE") {
             const tmdbUrl = \`https://api.themoviedb.org/3/search/multi?api_key=\${TMDB_API_KEY}&query=\${encodeURIComponent(extractedTitle)}&language=en-US&page=1\`;
             const tmdbRes = await fetch(tmdbUrl);
             if (tmdbRes.ok) {
                 const tmdbData = await tmdbRes.json();
                 if (tmdbData.results && tmdbData.results.length > 0) {
                    const topResult = tmdbData.results[0];
                    enhancedContext.tmdbMetadata = {
                       title: topResult.title || topResult.name,
                       type: topResult.media_type === "tv" ? "series" : "movie",
                       description: topResult.overview,
                       posterUrl: topResult.poster_path ? \`https://image.tmdb.org/t/p/w500\${topResult.poster_path}\` : null,
                       backdropUrl: topResult.backdrop_path ? \`https://image.tmdb.org/t/p/w1280\${topResult.backdrop_path}\` : null,
                       rating: topResult.vote_average,
                       year: topResult.release_date ? topResult.release_date.substring(0, 4) : (topResult.first_air_date ? topResult.first_air_date.substring(0, 4) : null)
                    };
                 }
             }
           }
        } catch(err) {
           console.error("TMDB Enhancement failed:", err);
        }
      }

      const userMessage = \`Admin Command: \${prompt.trim()}\\nCurrent Admin Context: \${JSON.stringify(enhancedContext)}\\nPlease analyze the admin's command and output the structured operational plan.\`;
`;

code = code.replace(
  /const userMessage = `Admin Command: \${prompt\.trim\(\)}\nCurrent Admin Context: \${JSON\.stringify\(context \|\| \{\}\)}\nPlease analyze the admin's command and output the structured operational plan\.`;/,
  tmdbInjection
);

fs.writeFileSync('server.ts', code);
