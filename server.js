const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 5173;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  try {
    const parsedUrl = url.parse(req.url);
    let pathname = decodeURIComponent(parsedUrl.pathname);
    
    if (pathname === '/') {
      pathname = '/index.html';
    }

    const filePath = path.join(__dirname, pathname);
    
    // 安全检查：确保请求的文件在当前目录下
    if (!filePath.startsWith(__dirname)) {
      res.writeHead(403);
      res.end('访问被拒绝');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('文件未找到: ' + pathname);
        console.error('404:', pathname);
      } else {
        const ext = path.parse(filePath).ext.toLowerCase();
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(data);
        console.log('200:', pathname, '(' + mimeType + ')');
      }
    });
  } catch (error) {
    res.writeHead(500);
    res.end('服务器错误: ' + error.message);
    console.error('500:', error);
  }
});

server.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('  🖥️ Tab Clean 本地预览服务器');
  console.log('='.repeat(50));
  console.log('  预览地址: http://localhost:' + PORT);
  console.log('  项目目录: ' + __dirname);
  console.log('  按 Ctrl+C 停止服务器');
  console.log('='.repeat(50) + '\n');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n\n正在停止服务器...');
  server.close(() => {
    console.log('服务器已停止。');
    process.exit(0);
  });
});