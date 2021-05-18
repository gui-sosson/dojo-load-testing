import { group, sleep } from 'k6';
import http from 'k6/http';

// This example demonstrate various options and the syntax to write a
// custom scenario.

// To debug run this script with -u 1 -i 1 --http-debug. These options
// means to run the script with one virtual User, with one Iteration
// and to display the requests/responses information

export const options = {
  maxRedirects: 0, // Recorded scenario should already have followed redirections but you may need to change that if you create your own scenario
  vus: 1,
  discardResponseBodies: true, // This prevent you from using the reponses content in the default function. It makes the tests faster. It can be overriden for specific requests with request param `responseType: 'text'`.
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
      abortOnFail: true
    }], // stop the test once 5% of calls take more than 5 seconds
    http_req_failed: [{
      threshold: "rate <= 0",
      abortOnFail: false
    }], // Do not authorise errors by default status codes outside [200 ; 399] (cf debug to avoid errors)
  },
};

// Easy way to use a new auth token
const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// This is the code that will be run in loops in parallel with as many virtual user as specified
export default function() {
  group("My scenario", function() { // The group allows you to customize the reporting (not used for the moment)
    let req, res;
    req = [{
      "method": "get",
      "url": "https://www.domain.com/incident-categories",
      "params": {
        "headers": {
          "authorization": token, // The token is used here
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36",
          "accept": "*/*",
          "accept-encoding": "gzip, deflate, br",
          "accept-language": "fr"
        },
        tags: {
          name: 'GET IncidentCategories'
        }
      }
    }, {
      "method": "get",
      "url": "https://www.domain.com/items",
      "params": {
        "headers": {
          "authorization": token,
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36",
          "accept": "*/*",
          "accept-encoding": "gzip, deflate, br",
          "accept-language": "fr"
        },
        tags: {
          name: 'GET Items'
        }
      }
    }];
    res = http.batch(req); // perform requests at a similar timing by batch (should be faster)

    // Because we wait after the response arrives, the request rate will
    // "saturate" at some point meaning the iterations takes more time
    // when you add virtual users. It is up to you to determine what is
    // to slow for your users.
    sleep(7.43);

    res = http.post(
      "https://www.domain.com/incidents",
      // Here the payload is different thanks to a little js to put
      // the date. Another strategy is to use a random index of an
      // array initialized outside the function (like the const
      // token). Or to use the iteration index and virtual user index
      // to customize each call in a uniq fashion. These index are in
      // the Execution context variables see:
      // https://k6.io/docs/using-k6/execution-context-variables
      `{"startDate":"${(new Date()).toISOString()}","categoryId":"importantCategory","routeId":"1234567643"`, {
        "headers": {
          "authorization": token,
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36",
          "content-type": "application/json",
          "accept": "application/json",
          "accept-encoding": "gzip, deflate, br",
          "accept-language": "fr"
        },
        responseType: 'text', // This overrides the global `discardResponseBodies` and allows to manipulate the response.
        tags: {
          // This customizes a tag of the measurement saved in InfluxDB and is
          // used to display the query on the table of grafana. The default is
          // the url which might be hard to read or not static depending on the
          // scenario.
          name: 'POST Incident'
        }
      }
    );
    const incidentId = res.json().aggregateId; // We can use json function because responseType: 'text' was used otherwise it would return null.

    sleep(3.23);

    req = [{
      "method": "get",
      "url": `www.domain.com/incidents/${incidentId}`, // We use the value from the previous reponse
      "params": {
        "headers": {
          "authorization": token,
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36",
          "accept": "*/*",
          "accept-encoding": "gzip, deflate, br",
          "accept-language": "fr"
        },
        tags: {
          name: 'GET Incident' // Here the tag is specially important as the url changes for each iteration. The tag makes sure these calls contributes to the same stats.
        }
      }
    }];
    res = http.batch(req);

    // Random sleep between 1s and 5s this is used to make sure virtual users are not in sync.
    sleep(Math.floor(Math.random() * 4 + 1));
  });
}
