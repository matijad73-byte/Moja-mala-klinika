import fs from 'fs';
import path from 'path';

// Root entry point for Cloud Run and local development
// When running in production on Cloud Run, 'npm start' executes 'node server.ts'.
// In that case, we delegate to the bundled production server (dist/server.cjs)
// which has all TypeScript modules and assets pre-compiled, avoiding runtime ESM resolution errors.
const distServerPath = path.join(process.cwd(), 'dist', 'server.cjs');

if (fs.existsSync(distServerPath) && process.env.VITE_DEV !== 'true') {
  // @ts-ignore - dynamic import of bundled CJS in production
  await import('./dist/server.cjs');
} else {
  await import('./server.app.ts');
}
