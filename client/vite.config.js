import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// https://vite.dev/config/
const versionPlugin = () => {
  return {
    name: 'version-plugin',
    handleHotUpdate({ file, server }) {
      if (file.includes('/src/') && !file.endsWith('version.json')) {
        const versionPath = path.resolve('src/version.json');

        try {
          let version = '0.1.0';
          if (fs.existsSync(versionPath)) {
            const content = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
            version = content.version;
          }

          let [major, minor, patch] = version.split('.').map(Number);
          patch++;
          if (patch > 9) {
            patch = 0;
            minor++;
          }

          const newVersion = `${major}.${minor}.${patch}`;
          fs.writeFileSync(versionPath, JSON.stringify({ version: newVersion }, null, 2));
        } catch (e) {
          console.error('Version bump failed:', e);
        }
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), versionPlugin()],
  server: {
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
