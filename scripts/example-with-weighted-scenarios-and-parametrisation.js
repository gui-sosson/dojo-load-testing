import { group, check, sleep } from 'k6';
import http from 'k6/http';

// This example suppose you already know how to write a custom scenario.

// Used to have memory shared across virtual users to avoid a crash.
import { SharedArray } from "k6/data";

const BRANDS = new SharedArray("brands", function() { return JSON.parse(open('./data/brands.json')).brands; });
const PRODUCTS = new SharedArray("products", function() { return JSON.parse(open('./data/products.json')).products; });

// This example demonstrate how to handle a case where you want to
// test several scenarios with various probabilities. This is
// especially useful to represent the trafic of a real platform where
// you know the current repartition of usage thanks to analytics or
// monitoring.

export let options = {
  vus: 1,
  stages: [
    {
      "duration": "30s",
      "target": 1
    },
    {
      "duration": "30s",
      "target": 70
    }
  ],
  maxRedirects: 0,
  thresholds: {
    "checks": [
      "rate <= 1"
    ],
    "http_req_duration": [
      "p(95) < 5000"
    ]
  },
  discardResponseBodies: true,
};

const BASE_URL = 'https://my.site.com'

// These two variables are used to select each scenario with its own
// weight. If it is easier for you, the weight can be a percentage but
// it's not mandatory for this to work.
const PAGE_TYPES = ['product', 'brand', 'homepage']
const PAGE_WEIGHTS = [65, 2, 49]

export default function () {
  switch (PAGE_TYPES[getWeightedPageTypesIndex()]) {
  case 'product':
    runProduct(`${BASE_URL}/products/${getRandomItem(PRODUCTS)}`);
    break;
  case 'brand':
    runBrand(`${BASE_URL}/brands/${getRandomItem(BRANDS)}`);
    break;
  case 'homepage':
    runHomePage(BASE_URL);
    break;
  }

  sleep(Math.floor(Math.random()*4+1));
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

const runHomePage = (url) => {
  group(`HOMEPAGE - ${url}`, function () {
    // This could be a complete independant scenario
    let req, res;
    req = [{
      "method": "get",
      "url": url,
    }];
    res = http.batch(req);
    check(res[0], { "status is 200": (r) => r.status === 200 });
  });
}

const runProduct = (productUrl) => {
  group(`PRODUCT - ${url}`, function () {
    // This could be a complete independant scenario
    let req, res;
    req = [{
      "method": "get",
      "url": url,
    }];
    res = http.batch(req);
    check(res[0], { "status is 200": (r) => r.status === 200 });
  });
}

const runBrand = (brandUrl) => {
  group(`BRAND - ${url}`, function () {
    // This could be a complete independant scenario
    let req, res;
    req = [{
      "method": "get",
      "url": url,
    }];
    res = http.batch(req);
    check(res[0], { "status is 200": (r) => r.status === 200 });
  });
}
