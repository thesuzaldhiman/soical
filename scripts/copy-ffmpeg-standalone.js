/**
 * copy-ffmpeg-standalone.js
 * Runs after `next build` to ensure the ffmpeg binary is included in `.next/standalone`
 * if Next.js created a standalone production server bundle.
 */
const fs = require('fs');
const path = require('path');

const platform = process.env.npm_config_platform || process.platform;
const binaryName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';

const srcCandidates = [
  path.join(__dirname, '..', 'bin', binaryName),
  path.join(__dirname, '..', 'public', 'bin', binaryName),
  path.join(__dirname, '..', 'node_modules', 'ffmpeg-static', binaryName),
];

let srcBinary = null;
for (const p of srcCandidates) {
  if (fs.existsSync(p) && fs.statSync(p).size > 1000000) {
    srcBinary = p;
    break;
  }
}

if (!srcBinary) {
  console.log('[copy-ffmpeg-standalone] No source binary found to copy.');
  process.exit(0);
}

const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');
if (fs.existsSync(standaloneDir)) {
  const targets = [
    path.join(standaloneDir, 'bin', binaryName),
    path.join(standaloneDir, 'public', 'bin', binaryName),
    path.join(standaloneDir, 'node_modules', 'ffmpeg-static', binaryName),
  ];

  targets.forEach((dest) => {
    try {
      const dir = path.dirname(dest);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(srcBinary, dest);
      fs.chmodSync(dest, 0o755);
      console.log(`[copy-ffmpeg-standalone] Injected binary into standalone: ${dest}`);
    } catch (e) {
      console.warn(`[copy-ffmpeg-standalone] Could not copy to ${dest}:`, e.message);
    }
  });
} else {
  console.log('[copy-ffmpeg-standalone] .next/standalone does not exist, skipping standalone injection.');
}
