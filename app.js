// OS Emulator — boots v86 (a WebAssembly x86 PC emulator) either against the
// bundled demo Linux ISO or a disk image the user picks from their own
// computer. Everything happens client-side: a picked File is handed to v86
// directly as `{ buffer: file }` (libv86.js reads it with FileReader/slice
// internally), so nothing is ever uploaded to this server — server.js only
// serves the static files and the demo ISO's bytes.
(function () {
  "use strict";

  const setupScreen = document.getElementById("setupScreen");
  const emulatorScreen = document.getElementById("emulatorScreen");
  const bootDemoBtn = document.getElementById("bootDemoBtn");
  const bootFileBtn = document.getElementById("bootFileBtn");
  const fileInput = document.getElementById("fileInput");
  const fileLabel = document.getElementById("fileLabel");
  const memSelect = document.getElementById("memSelect");
  const statusEl = document.getElementById("status");
  const emuStatus = document.getElementById("emuStatus");
  const resetBtn = document.getElementById("resetBtn");
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const powerBtn = document.getElementById("powerBtn");
  const screenContainer = document.getElementById("screen_container");

  let emulator = null;

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = kind || "";
  }

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) { bootFileBtn.disabled = true; fileLabel.textContent = ""; return; }
    const mb = (file.size / 1024 / 1024).toFixed(1);
    fileLabel.textContent = `${file.name} (${mb} MB)`;
    bootFileBtn.disabled = false;
  });

  function diskConfigFor(file) {
    // .iso mounts as a CD-ROM (ide/atapi); anything else is treated as a
    // raw hard-disk image — the common case for a .img you made yourself.
    const isIso = /\.iso$/i.test(file.name);
    return isIso ? { cdrom: { buffer: file } } : { hda: { buffer: file } };
  }

  function startEmulator(diskConfig, memoryMB) {
    setupScreen.classList.add("hidden");
    emulatorScreen.classList.add("active");
    emuStatus.textContent = "Starting…";

    emulator = new V86({
      wasm_path: "vendor/v86.wasm",
      bios: { url: "vendor/seabios.bin" },
      vga_bios: { url: "vendor/vgabios.bin" },
      memory_size: memoryMB * 1024 * 1024,
      vga_memory_size: 8 * 1024 * 1024,
      screen_container: screenContainer,
      autostart: true,
      ...diskConfig,
    });

    emulator.add_listener("download-progress", (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        emuStatus.textContent = `Loading ${(e.file_name || "").split("/").pop()} — ${pct}%`;
      }
    });
    emulator.add_listener("emulator-ready", () => { emuStatus.textContent = "Booting…"; });
    emulator.add_listener("emulator-started", () => { emuStatus.textContent = "Running"; });
    emulator.add_listener("emulator-stopped", () => { emuStatus.textContent = "Stopped"; });
  }

  bootDemoBtn.addEventListener("click", () => {
    setStatus("");
    startEmulator({ cdrom: { url: "images/demo-linux.iso" } }, 256);
  });

  bootFileBtn.addEventListener("click", () => {
    const file = fileInput.files[0];
    if (!file) return;
    setStatus("");
    startEmulator(diskConfigFor(file), parseInt(memSelect.value, 10));
  });

  resetBtn.addEventListener("click", () => { if (emulator) emulator.restart(); });

  fullscreenBtn.addEventListener("click", () => {
    if (emulator) emulator.screen_go_fullscreen();
  });

  powerBtn.addEventListener("click", async () => {
    if (!emulator) return;
    powerBtn.disabled = true;
    await emulator.destroy();
    emulator = null;
    powerBtn.disabled = false;
    screenContainer.innerHTML = "";
    emulatorScreen.classList.remove("active");
    setupScreen.classList.remove("hidden");
    setStatus("");
  });
})();
