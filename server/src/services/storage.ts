import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

let s3Client: S3Client | null = null;
if (process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });
}

export async function saveFile(file: Express.Multer.File): Promise<string> {
  const ext = path.extname(file.originalname);
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;

  if (s3Client && process.env.S3_BUCKET) {
    try {
      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      });
      await s3Client.send(command);
      return `${process.env.S3_PUBLIC_URL || ''}/${fileName}`;
    } catch (err) {
      console.warn('S3 upload failed, falling back to local storage:', err);
    }
  }

  // Local fallback
  const filePath = path.join(UPLOAD_DIR, fileName);
  await fs.promises.writeFile(filePath, file.buffer);
  return `/uploads/${fileName}`;
}
