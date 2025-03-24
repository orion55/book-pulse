import { fileURLToPath } from 'url';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

export function getDir(baseFolder: string): string {
  const baseDir = path.dirname(fileURLToPath(import.meta.url));

  return process.env.NODE_ENV === 'development'
    ? path.join(baseDir, '../..', baseFolder)
    : path.join(baseDir, baseFolder);
}
