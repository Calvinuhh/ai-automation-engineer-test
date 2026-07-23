import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { uploadedFiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withLogging } from '@/lib/with-logging';
import fs from 'fs/promises';
import path from 'path';

const RESEARCH_DATA_DIR = path.join(process.cwd(), 'data', 'research');

async function getResearchFileHandler(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionToken = searchParams.get('sessionToken');

  if (!sessionToken) {
    const files = await fs.readdir(RESEARCH_DATA_DIR).catch(() => []);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));
    return NextResponse.json({ files: jsonFiles });
  }

  try {
    const rows = await db
      .select()
      .from(uploadedFiles)
      .where(eq(uploadedFiles.sessionToken, sessionToken))
      .limit(1);

    const file = rows[0];
    if (file) {
      return NextResponse.json({ filePath: file.filePath, fileName: file.fileName });
    }
  } catch {
    // fall through
  }

  return NextResponse.json({ filePath: null, fileName: null });
}

async function uploadResearchFileHandler(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const sessionToken = formData.get('sessionToken');
  if (!sessionToken || typeof sessionToken !== 'string') {
    return NextResponse.json({ error: 'Session token is required' }, { status: 400 });
  }

  if (!file.name.endsWith('.json')) {
    return NextResponse.json({ error: 'Only JSON files are allowed' }, { status: 400 });
  }

  let content: string;
  try {
    content = await file.text();
  } catch {
    return NextResponse.json({ error: 'Failed to read file' }, { status: 400 });
  }

  try {
    JSON.parse(content);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON file' }, { status: 400 });
  }

  const oldRows = await db
    .select()
    .from(uploadedFiles)
    .where(eq(uploadedFiles.sessionToken, sessionToken))
    .limit(1);

  const oldFile = oldRows[0];
  if (oldFile) {
    await fs.unlink(oldFile.filePath).catch(() => {});
    await db.delete(uploadedFiles).where(eq(uploadedFiles.sessionToken, sessionToken));
  }

  await fs.mkdir(RESEARCH_DATA_DIR, { recursive: true });

  const fileName = `${Date.now()}-${file.name}`;
  const filePath = path.join(RESEARCH_DATA_DIR, fileName);
  await fs.writeFile(filePath, content);

  await db.insert(uploadedFiles).values({
    sessionToken,
    fileName,
    filePath,
  });

  return NextResponse.json({ filePath }, { status: 201 });
}

async function deleteResearchFileHandler(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionToken = searchParams.get('sessionToken');

  if (!sessionToken) {
    return NextResponse.json({ error: 'Session token is required' }, { status: 400 });
  }

  try {
    const rows = await db
      .select()
      .from(uploadedFiles)
      .where(eq(uploadedFiles.sessionToken, sessionToken))
      .limit(1);

    const file = rows[0];
    if (file) {
      await fs.unlink(file.filePath).catch(() => {});
      await db.delete(uploadedFiles).where(eq(uploadedFiles.sessionToken, sessionToken));
    }
  } catch {
    // Ignore deletion errors
  }

  return NextResponse.json({ ok: true });
}

export const GET = withLogging(getResearchFileHandler, '/api/research-files');
export const POST = withLogging(uploadResearchFileHandler, '/api/research-files');
export const DELETE = withLogging(deleteResearchFileHandler, '/api/research-files');
