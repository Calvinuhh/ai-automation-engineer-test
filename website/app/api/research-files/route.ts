import { NextResponse } from 'next/server';
import { withLogging } from '@/lib/with-logging';
import fs from 'fs/promises';
import path from 'path';

const RESEARCH_DATA_DIR = path.join(process.cwd(), '..', 'resources', 'research-data');

async function listResearchFilesHandler() {
  try {
    const files = await fs.readdir(RESEARCH_DATA_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));
    return NextResponse.json({ files: jsonFiles });
  } catch {
    return NextResponse.json({ files: [] });
  }
}

export const GET = withLogging(listResearchFilesHandler, '/api/research-files');
