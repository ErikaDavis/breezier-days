import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Every production build, including manual redeploys, has an independent ID.
const buildId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);

export default defineConfig({
  define: { __BREEZIER_BUILD_ID__: JSON.stringify(buildId) },
  plugins: [react(), {
    name: 'breezier-deployment-version',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'build-version.json', source: JSON.stringify({ buildId }) });
    },
  }],
});
