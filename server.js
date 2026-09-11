// OS Emulator — static file server. No framework, no build step: this just
// serves the page and vendored emulator core files as-is. The emulator
// itself (v86, WebAssembly) does all its work client-side in the browser —
// this server's only job is handing out the files, including range requests
// for the .iso/.wasm files so the browser can seek into them instead of
// downloading the whole thing up front.
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 6060;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".wasm": "application/wasm",
  ".bin": "application/octet-stream",
  ".iso": "application/octet-stream",
  ".img": "application/octet-stream",
};

function send416(res, size) {
  res.writeHead(416, { "Content-Range": `bytes */${size}` });
  res.end();
}

function serveFile(req, res, filePath) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404); res.end("Not found"); return; }
    const ext = path.extname(filePath);
    const type = MIME[ext] || "application/octet-stream";
    const range = req.headers.range;

    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range);
      let start = match[1] ? parseInt(match[1], 10) : 0;
      let end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
      if (isNaN(start) || isNaN(end) || start > end || end >= stat.size) { send416(res, stat.size); return; }
      res.writeHead(206, {
        "Content-Type": type,
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, { "Content-Type": type, "Content-Length": stat.size, "Accept-Ranges": "bytes" });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split("?")[0]);
  if (reqPath === "/") reqPath = "/index.html";
  const filePath = path.join(ROOT, path.normalize(reqPath).replace(/^(\.\.[/\\])+/, ""));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end("Forbidden"); return; }
  serveFile(req, res, filePath);
});

server.listen(PORT, () => {
  console.log(`OS Emulator running at http://localhost:${PORT}`);
});
