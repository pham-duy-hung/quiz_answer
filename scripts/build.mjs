import { build } from "vite";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  rmSync,
  existsSync,
} from "fs";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");

if (existsSync(dist)) {
  rmSync(dist, { recursive: true, force: true });
}
mkdirSync(dist, { recursive: true });

await build({
  root,
  configFile: false,
  build: {
    outDir: dist,
    emptyOutDir: false,
    lib: {
      entry: resolve(root, "src/background/service-worker.ts"),
      formats: ["es"],
      fileName: () => "background.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});

await build({
  root,
  configFile: false,
  build: {
    outDir: dist,
    emptyOutDir: false,
    lib: {
      entry: resolve(root, "src/content/content.ts"),
      name: "QuizAnswerContent",
      formats: ["iife"],
      fileName: () => "content.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        extend: true,
      },
    },
  },
});

const popupOut = resolve(root, ".popup-temp");
if (existsSync(popupOut)) {
  rmSync(popupOut, { recursive: true, force: true });
}

await build({
  root,
  configFile: false,
  base: "./",
  build: {
    outDir: popupOut,
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(root, "src/popup/popup.html"),
      output: {
        entryFileNames: "[name].js",
        assetFileNames: "[name][extname]",
        chunkFileNames: "[name].js",
      },
    },
  },
});

// Collect built popup files from nested or flat output
function findFiles(dir, filter) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(full, filter));
    } else if (filter(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

const popupHtmlSrc = findFiles(popupOut, (n) => n === "popup.html")[0];
const popupJsSrc = findFiles(
  popupOut,
  (n) => n.endsWith(".js") && n.includes("popup"),
)[0];
const popupCssSrc = findFiles(
  popupOut,
  (n) => n.endsWith(".css") && n.includes("popup"),
)[0];

if (!popupHtmlSrc || !popupJsSrc) {
  throw new Error("Popup build failed: missing popup.html or popup.js");
}

copyFileSync(popupJsSrc, resolve(dist, "popup.js"));
if (popupCssSrc) {
  copyFileSync(popupCssSrc, resolve(dist, "popup.css"));
}

let html = readFileSync(popupHtmlSrc, "utf-8");
html = html
  .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/i, '<script type="module" src="./popup.js"></script>')
  .replace(/<link[^>]*rel="stylesheet"[^>]*>/i, '<link rel="stylesheet" href="./popup.css" />');

// Ensure stylesheet link exists if CSS was built
if (popupCssSrc && !html.includes("popup.css")) {
  html = html.replace(
    "</head>",
    '    <link rel="stylesheet" href="./popup.css" />\n  </head>',
  );
}

writeFileSync(resolve(dist, "popup.html"), html);

copyFileSync(
  resolve(root, "src/content/overlay.css"),
  resolve(dist, "overlay.css"),
);

const manifest = JSON.parse(
  readFileSync(resolve(root, "public/manifest.json"), "utf-8"),
);
writeFileSync(resolve(dist, "manifest.json"), JSON.stringify(manifest, null, 2));

rmSync(popupOut, { recursive: true, force: true });

console.log("Build complete → dist/");
console.log(
  "Files:",
  readdirSync(dist)
    .map((n) => basename(n))
    .join(", "),
);
