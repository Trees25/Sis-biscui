import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const buildTimestamp = Date.now().toString();

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
  }
});
