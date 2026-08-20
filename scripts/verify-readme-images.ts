import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readme = readFileSync(join(root, 'README.md'), 'utf-8');
const imageRegex = /!\[[^\]]*\]\(([^)]+)\)/g;

let match: RegExpExecArray | null;
const errors: string[] = [];

while ((match = imageRegex.exec(readme)) !== null) {
  const imgPath = match[1]!;
  if (imgPath.startsWith('http')) continue;
  const fullPath = join(root, imgPath);
  if (!existsSync(fullPath)) {
    errors.push(`Missing image: ${imgPath} (expected at ${fullPath})`);
  } else {
    console.log(`✓ ${imgPath}`);
  }
}

if (errors.length > 0) {
  console.error('\nREADME image verification FAILED:');
  errors.forEach((e) => console.error(`  ✗ ${e}`));
  process.exit(1);
}

console.log('\nAll README images verified successfully.');
