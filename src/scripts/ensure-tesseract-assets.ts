import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const publicTesseractDir = resolve(rootDir, 'public/tesseract');
const langDataUrl = 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/heb/4.0.0_best_int/heb.traineddata.gz';

const localAssets = [
  {
    from: resolve(rootDir, 'node_modules/tesseract.js/dist/worker.min.js'),
    to: resolve(publicTesseractDir, 'worker.min.js'),
  },
  {
    from: resolve(rootDir, 'node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js'),
    to: resolve(publicTesseractDir, 'core/tesseract-core-lstm.wasm.js'),
  },
];

const ensureParentDir = async (filePath: string): Promise<void> => {
  await mkdir(dirname(filePath), { recursive: true });
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    const fileStat = await stat(filePath);
    return fileStat.isFile() && fileStat.size > 0;
  } catch {
    return false;
  }
};

const downloadFile = async (url: string, destination: string): Promise<void> => {
  if (await fileExists(destination)) return;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  await ensureParentDir(destination);
  await writeFile(destination, new Uint8Array(await response.arrayBuffer()));
};

await Promise.all(localAssets.map(async ({ from, to }) => {
  await ensureParentDir(to);
  await copyFile(from, to);
}));

await downloadFile(langDataUrl, resolve(publicTesseractDir, 'lang/heb.traineddata.gz'));

console.log('Tesseract offline assets are ready.');