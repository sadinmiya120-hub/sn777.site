const http = require('http');

const data = JSON.stringify({ uid: "TrnTDDothxMrGbj40bvszhr4VOH3" });
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/verify-user-deposits',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(body));
});
req.write(data);
req.end();
