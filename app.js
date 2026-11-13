const http = require('http');
const v = process.env.APP_VERSION || 'unknown';
http.createServer((req, res) => res.end(`App version: ${v}\n`)).listen(3000);
