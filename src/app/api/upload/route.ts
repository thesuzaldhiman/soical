import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';


export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure public/uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Determine extension
    let ext = path.extname(file.name || '').toLowerCase();
    if (!ext) {
      if (file.type.includes('png')) ext = '.png';
      else if (file.type.includes('jpeg') || file.type.includes('jpg')) ext = '.jpg';
      else if (file.type.includes('mp4')) ext = '.mp4';
      else if (file.type.includes('webm')) ext = '.webm';
      else if (file.type.includes('gif')) ext = '.gif';
      else ext = '.bin';
    }

    // Safe random filename
    const cleanBase = (file.name || 'media')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const filename = `${cleanBase}_${Date.now()}_${Math.floor(Math.random() * 10000)}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    console.error('[Upload API] Error saving file:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
