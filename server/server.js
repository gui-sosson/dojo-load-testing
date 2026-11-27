// Fake shop API used by the dojo.
//
// It behaves like a server with a fixed number of workers:
// - each request needs a worker for a short time (service time),
// - when every worker is busy, requests wait in a queue.
//
// So response time stays low while load is under capacity, and grows
// steadily once capacity is exceeded. No dependency.

const http = require('http');

const env = (name, fallback) => Number(process.env[name] ?? fallback);

const PORT = env('PORT', 8080);
const WORKERS = env('WORKERS', 10); // requests handled at the same time
const JITTER = env('JITTER', 0.3); // +/- 30% on service times

// Service time (ms) of each route when the server is idle.
const ROUTES = [
  { name: 'GET /api/products', pattern: /^\/api\/products\/?$/, serviceMs: 150, body: () => PRODUCT_SUMMARIES },
  {
    name: 'GET /api/products/:id',
    pattern: /^\/api\/products\/(\d+)$/,
    serviceMs: 50,
    body: ([id], req) => {
      const product = PRODUCTS.find((p) => p.id === Number(id));
      if (product) trackView(product, req);
      return product;
    },
  },
];

const PRODUCTS = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  name: `Product ${i + 1}`,
  price: Math.round((5 + ((i * 37) % 200)) * 100) / 100,
  description: `Product ${i + 1} is a great product. `.repeat(60),
  reviews: Array.from({ length: 200 }, (_, j) => ({
    author: `Customer ${j + 1}`,
    rating: 1 + ((i + j) % 5),
    comment: `Review ${j + 1} of product ${i + 1}: I would buy it again. `.repeat(4),
  })),
}));

// The product list only shows a summary of each product.
const PRODUCT_SUMMARIES = PRODUCTS.map(({ id, name, price }) => ({ id, name, price }));

// Product views, used to build the "recently viewed" block of the shop.
// A copy of the product is kept so that later price changes do not alter
// what the customer saw.
const viewHistory = [];

function trackView(product, req) {
  viewHistory.push({
    at: Date.now(),
    userAgent: req.headers['user-agent'],
    product: structuredClone(product),
  });

  // You found the memory leak! Uncomment the line below to fix it.
  // if (viewHistory.length > 100) viewHistory.shift();
}

let busyWorkers = 0;
const queue = [];
let served = 0;

function startNext() {
  while (busyWorkers < WORKERS && queue.length) {
    const job = queue.shift();
    if (job.res.destroyed) continue; // client gave up while waiting
    busyWorkers++;
    const jitter = 1 + (Math.random() * 2 - 1) * JITTER;
    setTimeout(() => {
      busyWorkers--;
      if (!job.res.destroyed) {
        const payload = job.route.body(job.params, job.req);
        job.res.writeHead(payload ? 200 : 404, { 'content-type': 'application/json' });
        job.res.end(JSON.stringify(payload ?? { error: 'not found' }));
        served++;
      }
      startNext();
    }, job.route.serviceMs * jitter);
  }
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ busyWorkers, queued: queue.length }));
    return;
  }

  const route = req.method === 'GET' && ROUTES.find((r) => r.pattern.test(req.url));
  if (!route) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }

  queue.push({ route, params: req.url.match(route.pattern).slice(1), req, res });
  startNext();
});

// Many virtual users keep connections open: do not let Node limit them.
server.keepAliveTimeout = 65000;
server.maxConnections = Infinity;

setInterval(() => {
  console.log(`busy workers ${busyWorkers}/${WORKERS} | queued ${queue.length} | served ${served}`);
  served = 0;
}, 5000);

server.listen(PORT, () => {
  console.log(`Shop API on http://localhost:${PORT} (workers=${WORKERS})`);
});
