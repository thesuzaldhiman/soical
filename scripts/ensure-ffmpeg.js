/**
 * ensure-ffmpeg.js
 * Hostinger build environment skips postinstall scripts (--ignore-scripts / allowScripts).
 * This script ensures the ffmpeg binary exists before/during build.
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
          fs.chmodSync(dest, 0o755);
          resolve();
        });
      });

      gunzip.on('error', reject);
      fileStream.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  const platform = process.env.npm_config_platform || process.platform;
  const arch = process.env.npm_config_arch || process.arch;

  console.log(`[ensure-ffmpeg] Platform: ${platform}, Arch: ${arch}`);

  // Check if system ffmpeg or local ffmpeg exists
  const targetDir = path.join(__dirname, '..', 'bin');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const binaryName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const localBinaryPath = path.join(targetDir, binaryName);

  if (fs.existsSync(localBinaryPath)) {
    console.log(`[ensure-ffmpeg] Binary already exists at ${localBinaryPath}`);
    return;
  }

  // Also check if node_modules/ffmpeg-static/ffmpeg exists
  const nodeModulesPath = path.join(__dirname, '..', 'node_modules', 'ffmpeg-static', binaryName);
  if (fs.existsSync(nodeModulesPath)) {
    console.log(`[ensure-ffmpeg] Found in node_modules: ${nodeModulesPath}`);
    return;
  }

  console.log(`[ensure-ffmpeg] ffmpeg binary missing. Downloading for ${platform}-${arch}...`);
  const tag = 'b6.1.1';
  const url = `https://github.com/eugeneware/ffmpeg-static/releases/download/${tag}/ffmpeg-${platform}-${arch}.gz`;

  try {
    await download(url, localBinaryPath);
    console.log(`[ensure-ffmpeg] Downloaded and made executable: ${localBinaryPath}`);
  } catch (err) {
    console.warn(`[ensure-ffmpeg] Could not auto-download binary: ${err.message}`);
    // If it's not a critical failure on build, don't crash next build, runtime fallback will attempt again
  }
}

main().catch((err) => {
  console.warn('[ensure-ffmpeg] Execution warning:', err.message);
});
