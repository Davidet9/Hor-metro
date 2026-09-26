import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';

// Persistent Local Database Plugin for Vite Dev Server
function localDatabasePlugin(): Plugin {
  const dataDir = path.resolve(__dirname, 'data');
  const dbFile = path.resolve(dataDir, 'machinery_db.json');

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return {
    name: 'machinery-database-api',
    configureServer(server) {
      server.middlewares.use('/api/db', (req, res) => {
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'GET') {
          if (fs.existsSync(dbFile)) {
            try {
              const content = fs.readFileSync(dbFile, 'utf-8');
              res.statusCode = 200;
              res.end(content);
              return;
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Failed to read database file' }));
              return;
            }
          } else {
            // Not initialized yet, return null so frontend seeds initial data
            res.statusCode = 200;
            res.end(JSON.stringify({ initialized: false, data: null }));
            return;
          }
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', () => {
            try {
              // Validate JSON
              const parsed = JSON.parse(body);
              fs.writeFileSync(dbFile, JSON.stringify(parsed, null, 2), 'utf-8');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, savedAt: new Date().toISOString() }));
            } catch (err: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid JSON payload', details: err.message }));
            }
          });
          return;
        }

        res.statusCode = 405;
        res.end(JSON.stringify({ error: 'Method not allowed' }));
      });

      // Health check endpoint
      server.middlewares.use('/api/health', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({ status: 'ok', serverTime: new Date().toISOString() }));
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), localDatabasePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
