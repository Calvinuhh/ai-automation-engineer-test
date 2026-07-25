import { S3Client } from '@aws-sdk/client-s3';

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ENDPOINT = process.env.R2_ENDPOINT;
export const R2_BUCKET = process.env.R2_BUCKET_NAME;

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: R2_SECRET_ACCESS_KEY ?? '',
  },
});

export function getR2Key(listicleId: number, fileName: string): string {
  return `listicles/${listicleId}/${fileName}`;
}

export function getR2Url(listicleId: number, fileName: string): string {
  return `${R2_ENDPOINT}/${R2_BUCKET}/listicles/${listicleId}/${fileName}`;
}
