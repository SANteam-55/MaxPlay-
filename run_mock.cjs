const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("error", () => { console.error("ERR", ...arguments); });
virtualConsole.on("warn", () => { console.warn("WARN", ...arguments); });
virtualConsole.on("info", () => { console.info("INFO", ...arguments); });
virtualConsole.on("log", () => { console.log("LOG", ...arguments); });
virtualConsole.on("jsdomError", (e) => { console.error("JSDOM_ERR", e); });

const html = fs.readFileSync('public/admin.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously", virtualConsole });
setTimeout(() => {
  console.log("Mock finished");
}, 1000);
