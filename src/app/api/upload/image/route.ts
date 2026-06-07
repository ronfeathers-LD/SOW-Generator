import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase-server';

// Supabase Storage bucket that holds rich-text-editor images (public read).
const BUCKET = 'rte-images';

// Detect a real raster image from its magic bytes (don't trust the client's
// content-type or filename extension). SVG is intentionally excluded.
function detectImageType(buf: Buffer): { type: string; ext: string } | null {
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { type: 'image/png', ext: 'png' };
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { type: 'image/jpeg', ext: 'jpg' };
  }
  if (buf.length >= 4 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
    return { type: 'image/gif', ext: 'gif' };
  }
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return { type: 'image/webp', ext: 'webp' };
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (5MB limit) before reading the whole buffer
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    // Validate the actual bytes, not the client-supplied content-type/extension.
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const detected = detectImageType(buffer);
    if (!detected) {
      return NextResponse.json(
        { error: 'File must be a PNG, JPEG, GIF, or WebP image' },
        { status: 400 }
      );
    }

    // Generate a unique filename using the DETECTED extension.
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileName = `${timestamp}-${randomString}.${detected.ext}`;

    // Upload to Supabase Storage with the validated content-type.
    const supabase = createServiceRoleClient();

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType: detected.type,
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading image to Supabase Storage:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
      filename: fileName,
      size: file.size,
      type: detected.type,
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
