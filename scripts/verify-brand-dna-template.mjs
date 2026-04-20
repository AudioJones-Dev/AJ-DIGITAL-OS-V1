import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { BrandDNASchema } from '../dist/schemas/brand-dna.schema.js';

const templatePath = path.resolve('src', 'data', 'clients', '_template', 'brand-dna.json');

const run = async () => {
  const raw = await readFile(templatePath, 'utf-8');
  const parsed = JSON.parse(raw.replace(/^\uFEFF/, ''));
  BrandDNASchema.parse(parsed);

  console.log(`Brand DNA template is valid: ${templatePath}`);
};

run().catch((error) => {
  console.error('Brand DNA template validation failed.');
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exitCode = 1;
});
