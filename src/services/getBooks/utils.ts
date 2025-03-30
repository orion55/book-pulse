import path from "path";
import fs from "fs";

const generateUniqueFilePath = (filePath: string): string => {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  let candidate = filePath;
  let counter = 1;

  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${base}_${counter}${ext}`);
    counter++;
  }
  return candidate;
};

export const downloadAndSave = async (
  url: string,
  assetsDir: string,
  fileName: string,
): Promise<string> => {
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  const initialPath = path.join(assetsDir, fileName);
  const uniquePath = generateUniqueFilePath(initialPath);
  fs.writeFileSync(uniquePath, buffer);
  return uniquePath;
};
