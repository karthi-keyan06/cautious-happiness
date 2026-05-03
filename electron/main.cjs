const { app, BrowserWindow } = require('electron')
const path = require('path')

// Determine if we're in dev mode
const isDev = process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'StudySync — GATE Preparation',
    autoHideMenuBar: true,
    backgroundColor: '#0a0d14',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    // win.webContents.openDevTools() // Uncomment to debug
  } else {
    // Serve the built files over HTTP so Google OAuth doesn't block file://
    const server = require('http').createServer((req, res) => {
      let urlPath = req.url.split('?')[0];
      if (urlPath === '/') urlPath = '/index.html';
      let filePath = path.join(__dirname, '..', 'dist', urlPath);

      const extname = String(path.extname(filePath)).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.svg': 'image/svg+xml',
      };
      const contentType = mimeTypes[extname] || 'application/octet-stream';

      require('fs').readFile(filePath, (err, content) => {
        if (err) {
          // Fallback to index.html for SPA routing
          require('fs').readFile(path.join(__dirname, '..', 'dist', 'index.html'), (err2, content2) => {
            if (err2) {
              res.writeHead(404);
              res.end('Not found');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(content2, 'utf-8');
            }
          });
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content, 'utf-8');
        }
      });
    });

    // Try to listen on the standard Vite port so Google OAuth origin matches
    server.listen(5173, '127.0.0.1', () => {
      win.loadURL('http://localhost:5173');
    }).on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        // Port in use, probably Vite dev server is running
        win.loadURL('http://localhost:5173');
      } else {
        // Fallback to file protocol if server fails
        win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
      }
    });
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
