/**
 * ensure-yt-dlp.js
 * Prepares the standalone yt-dlp binary for YouTube video stream extraction.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Download failed (${res.statusCode}): ${url}`));
      }

      const dir = path.dirname(dest);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close(() => {
          try {
            fs.chmodSync(dest, 0o755);
          } catch {}
          resolve(true);
        });
      });

      fileStream.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  const platform = process.platform;
  const isLinux = platform === 'linux';
  const binaryName = 'yt-dlp';
  const downloadUrl = isLinux
    ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux'
    : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';

  const binDir = path.join(__dirname, '..', 'bin');
  const publicBinDir = path.join(__dirname, '..', 'public', 'bin');
  const targetBin = path.join(binDir, binaryName);
  const targetPublicBin = path.join(publicBinDir, binaryName);

  if (fs.existsSync(targetBin) && fs.statSync(targetBin).size > 5000000) {
    console.log(`[ensure-yt-dlp] Binary already present at ${targetBin}`);
    try {
      if (!fs.existsSync(targetPublicBin)) {
        fs.mkdirSync(publicBinDir, { recursive: true });
        fs.copyFileSync(targetBin, targetPublicBin);
        fs.chmodSync(targetPublicBin, 0o755);
      }
    } catch {}
    return;
  }

  // Check /tmp/yt-dlp if cached locally
  const tmpPath = '/tmp/yt-dlp';
  if (fs.existsSync(tmpPath) && fs.statSync(tmpPath).size > 5000000) {
    try {
      if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });
      if (!fs.existsSync(publicBinDir)) fs.mkdirSync(publicBinDir, { recursive: true });
      fs.copyFileSync(tmpPath, targetBin);
      fs.copyFileSync(tmpPath, targetPublicBin);
      fs.chmodSync(targetBin, 0o755);
      fs.chmodSync(targetPublicBin, 0o755);
      console.log(`[ensure-yt-dlp] Copied from /tmp/yt-dlp to ${targetBin}`);
      return;
    } catch {}
  }

  console.log(`[ensure-yt-dlp] Downloading ${binaryName} for ${platform}...`);
  try {
    await downloadFile(downloadUrl, targetBin);
    if (!fs.existsSync(publicBinDir)) fs.mkdirSync(publicBinDir, { recursive: true });
    fs.copyFileSync(targetBin, targetPublicBin);
    fs.chmodSync(targetBin, 0o755);
    fs.chmodSync(targetPublicBin, 0o755);
    console.log(`[ensure-yt-dlp] Successfully downloaded and prepared ${targetBin}`);
  } catch (err) {
    console.warn(`[ensure-yt-dlp] Download skipped or failed: ${err.message}. Will use dynamic runtime fallback.`);
  }
}

main().catch((err) => {
  console.warn('[ensure-yt-dlp] Error in ensure-yt-dlp:', err.message);
});
