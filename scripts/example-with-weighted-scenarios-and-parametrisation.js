import { group, sleep } from 'k6';
import http from 'k6/http';

// This example suppose you already know how to write a custom scenario.

// Used to have memory shared across virtual users to avoid a crash.
import { SharedArray } from "k6/data";

const BRANDS = new SharedArray("brands", function() {
  return JSON.parse(open('./data/brands.json')).brands;
});
const PRODUCTS = new SharedArray("products", function() {
  return JSON.parse(open('./data/products.json')).products;
});

// This example demonstrate how to handle a case where you want to
// test several scenarios with various probabilities. This is
// especially useful to represent the trafic of a real platform where
// you know the current repartition of usage thanks to analytics or
// monitoring.

export const options = {
  maxRedirects: 0,
  vus: 1,
  discardResponseBodies: true,
  scenarios: {
    "ramp-up": {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [{
        duration: "30s",
        target: 70
      }, {
        duration: "4m",
        target: 150
      }, ],
      gracefulRampDown: "0s",
      gracefulStop: "30s",
    },
  },
  thresholds: {
    http_req_duration: [{
      threshold: "p(95) < 5000",
      abortOnFail: false
    }],
    http_req_failed: [{
      threshold: "rate <= 0",
      abortOnFail: false
    }],
  },
};

const BASE_URL = 'https://my.site.com'

// These two variables are used to select each scenario with its own
// weight. If it is easier for you, the weight can be a percentage but
// it's not mandatory for this to work.
const PAGE_TYPES = ['product', 'brand', 'homepage']
const PAGE_WEIGHTS = [65, 2, 49]

export default function() {
  switch (PAGE_TYPES[getWeightedPageTypesIndex()]) {
    case 'product':
      getPage('PRODUCT PAGE', `${BASE_URL}/products/${getRandomItem(PRODUCTS)}`);
      break;
    case 'brand':
      getPage('BRAND PAGE', `${BASE_URL}/brands/${getRandomItem(BRANDS)}`);
      break;
    case 'homepage':
      getPage('HOMEPAGE', BASE_URL);
      break;
  }

  sleep(Math.floor(Math.random() * 4 + 1));
}

// This function let us get a random item to create a variety of
// request on the same URLs but with a different id for instance.
const getRandomItem = items => items[Math.floor(Math.random() * items.length)]

// This function let us get the index of the scenario we want. It uses
// the weight to randomly return each option with the right
// probability.
const getWeightedPageTypesIndex = () => {
  const weightsSum = PAGE_WEIGHTS.reduce((acc, el) => acc + el, 0);
  let acc = 0;
  let pageTypeThresholds = PAGE_WEIGHTS;
  pageTypeThresholds = pageTypeThresholds.map(el => (acc = el + acc))

  return pageTypeThresholds
    .filter(el => el <= Math.random() * weightsSum)
    .length
}

const getPage = (pageName, url) => {
  group(`${pageName} - ${url}`, function() {
    // This could be a complete independant scenario
    http.get(url);
  });
}
