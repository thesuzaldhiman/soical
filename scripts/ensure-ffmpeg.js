/**
 * ensure-ffmpeg.js
 * Hostinger build environment skips postinstall scripts (--ignore-scripts / allowScripts).
 * This script ensures the ffmpeg binary exists in project directories (bin/ and public/bin/)
 * before Next.js builds and bundles the application.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Download failed with status ${res.statusCode}: ${url}`));
      }

      const gunzip = zlib.createGunzip();
      const fileStream = fs.createWriteStream(dest);

      res.pipe(gunzip).pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close(() => {
          try {
            fs.chmodSync(dest, 0o755);
          } catch {}
          resolve();
        });
      });

      gunzip.on('error', reject);
      fileStream.on('error', reject);
    }).on('error', reject);
  });
}

function copyBinary(src, dest) {
  try {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(src, dest);
    fs.chmodSync(dest, 0o755);
    console.log(`[ensure-ffmpeg] Copied binary to ${dest}`);
  } catch (err) {
    console.warn(`[ensure-ffmpeg] Failed to copy to ${dest}: ${err.message}`);
  }
}

async function main() {
  const platform = process.env.npm_config_platform || process.platform;
  const arch = process.env.npm_config_arch || process.arch;
  const binaryName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';

  console.log(`[ensure-ffmpeg] Target platform: ${platform}, arch: ${arch}`);

  const binDir = path.join(__dirname, '..', 'bin');
  const publicBinDir = path.join(__dirname, '..', 'public', 'bin');
  if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });
  if (!fs.existsSync(publicBinDir)) fs.mkdirSync(publicBinDir, { recursive: true });

  const binDest = path.join(binDir, binaryName);
  const publicBinDest = path.join(publicBinDir, binaryName);

  // 1. Check if node_modules/ffmpeg-static/ffmpeg exists
  const nodeModulesPath = path.join(__dirname, '..', 'node_modules', 'ffmpeg-static', binaryName);
  let foundBinary = null;

  if (fs.existsSync(nodeModulesPath) && fs.statSync(nodeModulesPath).size > 1000000) {
    console.log(`[ensure-ffmpeg] Found in node_modules: ${nodeModulesPath}`);
    foundBinary = nodeModulesPath;
  } else if (fs.existsSync(binDest) && fs.statSync(binDest).size > 1000000) {
    console.log(`[ensure-ffmpeg] Found in bin: ${binDest}`);
    foundBinary = binDest;
  }

  // 2. If not found, download it
  if (!foundBinary) {
    console.log(`[ensure-ffmpeg] ffmpeg missing. Downloading for ${platform}-${arch}...`);
    const tag = 'b6.1.1';
    const url = `https://github.com/eugeneware/ffmpeg-static/releases/download/${tag}/ffmpeg-${platform}-${arch}.gz`;
    try {
      await download(url, binDest);
      console.log(`[ensure-ffmpeg] Downloaded and made executable: ${binDest}`);
      foundBinary = binDest;
    } catch (err) {
      console.warn(`[ensure-ffmpeg] Download error: ${err.message}`);
    }
  }

  // 3. Mirror the binary across all deployment target locations
  if (foundBinary) {
    if (binDest !== foundBinary) copyBinary(foundBinary, binDest);
    copyBinary(foundBinary, publicBinDest);
  }
}

main().catch((err) => {
  console.warn('[ensure-ffmpeg] Execution warning:', err.message);
});
