// Capacitor bundles whatever's in webDir (www/) into the Android app's
// assets — this just mirrors the actual page there first. Kept as a
// separate step (not committed itself, see .gitignore) rather than making
// www/ the source of truth, so index.html/app.js/vendor/images stay a
// single copy that the browser, Electron, and Android versions all share.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const WWW = path.join(ROOT, "www");

function copy(name) {
  const src = path.join(ROOT, name);
  const dest = path.join(WWW, name);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
}

fs.mkdirSync(WWW, { recursive: true });
["index.html", "app.js", "vendor", "images"].forEach(copy);
console.log("www/ ready for Capacitor (index.html, app.js, vendor/, images/)");
