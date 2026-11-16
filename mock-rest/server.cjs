const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const port = Number(process.env.MOCK_API_PORT || 8787);
const catalogPath = path.join(__dirname, 'catalog.json');
const ordersPath = process.env.SKYNOVA_MOCK_ORDERS_FILE || path.join(__dirname, 'orders.json');

const server = http.createServer((request, response) => {
  void handleRequest(request, response).catch((error) => {
    console.error(`Mock REST request failed: ${error.message}`);
    if (!response.headersSent) sendJson(response, 500, { error: 'Mock REST request failed.' });
    else response.destroy();
  });
});

async function handleRequest(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.writeHead(204).end();
    return;
  }

  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  console.log(`${new Date().toISOString()} ${request.method} ${url.pathname}`);
  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, { status: 'ok' });
    return;
  }
  if (request.method === 'GET' && url.pathname === '/catalog') {
    sendJson(response, 200, JSON.parse(await fs.readFile(catalogPath, 'utf8')));
    return;
  }
  const orderMatch = url.pathname.match(/^\/orders\/([^/]+)$/);
  if (request.method === 'PUT' && orderMatch) {
    const orderId = decodeURIComponent(orderMatch[1]);
    const order = await readJsonBody(request);
    if (order.id !== orderId || typeof order.user_id !== 'string' || !Array.isArray(order.items)) {
      sendJson(response, 400, { error: 'Invalid order payload.' });
      return;
    }
    let orders = {};
    try {
      orders = JSON.parse(await fs.readFile(ordersPath, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    orders[orderId] = order;
    await fs.writeFile(ordersPath, `${JSON.stringify(orders, null, 2)}\n`, 'utf8');
    sendJson(response, 200, order);
    return;
  }

  sendJson(response, 404, { error: 'Not found.' });
}

server.listen(port, '0.0.0.0', () => {
  console.log(`SkyNova mock REST API listening on http://0.0.0.0:${port}`);
});

function sendJson(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    request.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > 256 * 1024) {
        reject(new Error('Request body is too large.'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('Invalid JSON request body.'));
      }
    });
    request.on('error', reject);
  });
}
