/**
 * ensure-yt-dlp.js
 * Prepares the Python 3.9-compatible yt-dlp binary for YouTube video stream extraction.
 * Uses release 2025.10.14 which is guaranteed to run on Python 3.9+ environments (e.g., Hostinger CloudLinux/CentOS).
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const REQUIRED_VERSION = '2025.10.14';
const downloadUrl = `https://github.com/yt-dlp/yt-dlp/releases/download/${REQUIRED_VERSION}/yt-dlp`;

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
  const binaryName = 'yt-dlp';
  const binDir = path.join(__dirname, '..', 'bin');
  const publicBinDir = path.join(__dirname, '..', 'public', 'bin');
  const targetBin = path.join(binDir, binaryName);
  const targetPublicBin = path.join(publicBinDir, binaryName);
  const versionMarkerPath = path.join(binDir, '.ytdlp_version');

  let hasValidBinary = false;
  if (fs.existsSync(targetBin) && fs.existsSync(versionMarkerPath)) {
    try {
      const v = fs.readFileSync(versionMarkerPath, 'utf8').trim();
      if (v === REQUIRED_VERSION && fs.statSync(targetBin).size > 2000000) {
        hasValidBinary = true;
      }
    } catch {}
  }

  if (hasValidBinary) {
    console.log(`[ensure-yt-dlp] Verified yt-dlp v${REQUIRED_VERSION} already present at ${targetBin}`);
    try {
      if (!fs.existsSync(targetPublicBin)) {
        fs.mkdirSync(publicBinDir, { recursive: true });
        fs.copyFileSync(targetBin, targetPublicBin);
        fs.chmodSync(targetPublicBin, 0o755);
      }
    } catch {}
    return;
  }

  console.log(`[ensure-yt-dlp] Downloading Python 3.9-compatible yt-dlp (${REQUIRED_VERSION})...`);
  try {
    await downloadFile(downloadUrl, targetBin);
    fs.writeFileSync(versionMarkerPath, REQUIRED_VERSION, 'utf8');

    if (!fs.existsSync(publicBinDir)) fs.mkdirSync(publicBinDir, { recursive: true });
    fs.copyFileSync(targetBin, targetPublicBin);
    fs.chmodSync(targetBin, 0o755);
    fs.chmodSync(targetPublicBin, 0o755);

    // Also overwrite /tmp/yt-dlp if it exists to purge any incompatible versions
    try {
      if (fs.existsSync('/tmp/yt-dlp')) {
        fs.copyFileSync(targetBin, '/tmp/yt-dlp');
        fs.chmodSync('/tmp/yt-dlp', 0o755);
      }
    } catch {}

    console.log(`[ensure-yt-dlp] Successfully prepared yt-dlp ${REQUIRED_VERSION} at ${targetBin}`);
  } catch (err) {
    console.warn(`[ensure-yt-dlp] Download warning: ${err.message}. Will use dynamic runtime fallback.`);
  }
}

main().catch((err) => {
  console.warn('[ensure-yt-dlp] Error in ensure-yt-dlp:', err.message);
});
