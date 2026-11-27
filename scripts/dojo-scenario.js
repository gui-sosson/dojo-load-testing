import { sleep } from 'k6';
import http from 'k6/http';

// Scenario against the dojo server (`server/server.js`).
//
// Run it with: docker-compose run --rm k6 run /scripts/dojo-scenario.js
// From your machine (k6 installed locally): BASE_URL=http://localhost:8080 k6 run scripts/dojo-scenario.js

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
  // TODO: write the journey of a customer.
  // Products: GET ${BASE_URL}/api/products and GET ${BASE_URL}/api/products/:id (id from 1 to 100)
}
