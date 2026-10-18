import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const PHOTO_DIRECTORY = path.join(process.cwd(), 'public', 'uploads', 'progress-reports');
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

const PHOTO_TYPES = {
  'image/jpeg': {
    extension: 'jpg',
    matches: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  'image/png': {
    extension: 'png',
    matches: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  },
  'image/webp': {
    extension: 'webp',
    matches: (buffer) =>
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP',
  },
};

export async function saveProgressPhoto(file) {
  if (!file || typeof file.arrayBuffer !== 'function' || file.size <= 0) {
    throw new Error('A progress photo is required.');
  }
  if (file.size > MAX_PHOTO_SIZE) {
    throw new Error('The photo must be 5 MB or smaller.');
  }

  const photoType = PHOTO_TYPES[file.type];
  if (!photoType) {
    throw new Error('Upload a JPEG, PNG, or WebP image.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!photoType.matches(buffer)) {
    throw new Error('The uploaded file is not a valid image.');
  }

  await mkdir(PHOTO_DIRECTORY, { recursive: true });
  const filename = `${randomUUID()}.${photoType.extension}`;
  await writeFile(path.join(PHOTO_DIRECTORY, filename), buffer, { flag: 'wx' });
  return `/uploads/progress-reports/${filename}`;
}

export async function deleteProgressPhoto(photoPath) {
  const prefix = '/uploads/progress-reports/';
  if (!photoPath?.startsWith(prefix)) return;

  const filename = photoPath.slice(prefix.length);
  if (!/^[\da-f-]+\.(jpg|png|webp)$/i.test(filename)) return;

  try {
    await unlink(path.join(PHOTO_DIRECTORY, filename));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Could not remove progress photo:', error);
    }
  }
}
