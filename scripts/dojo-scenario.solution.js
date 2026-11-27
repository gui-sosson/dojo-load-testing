import { sleep } from 'k6';
import http from 'k6/http';

// Solution of exercise 1: the journey of a customer on the dojo server
// (`server/server.js`). They look at the product list, then open one product.
//
// Run it with: docker-compose run --rm k6 run /scripts/dojo-scenario.solution.js

const BASE_URL = __ENV.BASE_URL || 'http://app:8080';

export const options = {
  discardResponseBodies: true,
  vus: 1,
  duration: '10s',
  thresholds: {
    http_req_failed: ['rate <= 0'],
  },
};

export default function () {
  http.get(`${BASE_URL}/api/products`, { tags: { name: 'GET /api/products' } });
  sleep(1);

  const id = Math.floor(Math.random() * 100) + 1;
  http.get(`${BASE_URL}/api/products/${id}`, { tags: { name: 'GET /api/products/:id' } });
  sleep(1);
}
