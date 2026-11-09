import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAllowedOrigins, isOriginAllowed } from './src/utils/corsConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const buildTimestamp = Date.now().toString();

const corsOriginValidator = (origin, callback) => {
  if (isOriginAllowed(origin, process.env.VITE_APP_ORIGIN)) {
    callback(null, true);
  } else {
    callback(new Error(`Origen bloqueado por política CORS: ${origin}`), false);
  }
};

const generateVersionPlugin = () => ({
  name: 'generate-version',
  buildStart() {
    const versionDir = path.resolve(__dirname, 'public');
    if (!fs.existsSync(versionDir)) {
      fs.mkdirSync(versionDir, { recursive: true });
    }
    fs.writeFileSync(
      path.resolve(versionDir, 'version.json'),
      JSON.stringify({ version: buildTimestamp })
    );
  }
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), generateVersionPlugin()],
  define: {
    __APP_BUILD_TIME__: JSON.stringify(buildTimestamp)
  },
  server: {
    cors: {
      origin: corsOriginValidator,
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'apikey', 'X-Client-Info']
    }
  },
  preview: {
    cors: {
      origin: getAllowedOrigins(process.env.VITE_APP_ORIGIN),
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true
    }
  }
});
