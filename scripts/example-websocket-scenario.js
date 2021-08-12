import { check, sleep } from 'k6';
import ws from "k6/ws";
import { Trend } from 'k6/metrics';

// This example suppose you already know how to write a custom scenario.

let wsLatency = new Trend('ws_latency'); // needed if you want to measure a latency. Since there is no response with websocket k6 only measure connecting duration.

const pingRate = 10;

export const options = {
  discardResponseBodies: true,
  scenarios: {
    "ramp-up": {
      executor: "ramping-vus",
      exec: "createLoad",
      startVUs: 0,
      stages: [
        {
          duration: "20s",
          target: 30,
        }, {
          duration: "1m",
          target: 60,
        },
      ],
      gracefulRampDown: "30s",
      gracefulStop: "30s",
    },
    "ping": {
      executor: "constant-arrival-rate",
      exec: "measure",
      rate: pingRate,
      duration: '1m30s',
      preAllocatedVUs: 2*pingRate + 1, // preallocate as much VUs as ping per 2 seconds because a VUs ends after 2 seconds (+1 VU for rounding mistakes)
      maxVUs: 100,
    },
  },
  thresholds: {
    ws_latency: [{
      threshold: "p(95) < 1000",
      abortOnFail: true
    }],
    checks: [{
      threshold: "rate >= 1",
      abortOnFail: false
    }],
  },
};

const url = 'ws://demo-ws-923214697.eu-west-1.elb.amazonaws.com/ws/';

export function createLoad() {
  const res = ws.connect(url, function (socket) { // connect to your server
    socket.setTimeout(function () {
      socket.close(); // will close connection after 6s to 9s (and thus finish iteration)
    }, Math.floor(Math.random() * 3000 + 6000));

    socket.on('open', () => {
      const startTimesamp = Date.now()
      socket.setInterval(() => { // begin to send messages regularly (here 50ms)
        if (Date.now() - startTimesamp > 5000) {
          return; // stop sending messages after 5s (before connection is be closed)
        }
        const message = JSON.stringify({ payload: { x: 4, y: 4 }, meta : { emitTimestamp: Date.now()} }); // you need to customize your messages
	socket.send(message);
      }, 50);
    });

    socket.on('message', (data) => { // measure latency thanks to the field in the data (your server need to return the latency field in the data)
      const message = JSON.parse(data)
      const latency = Date.now() - message.meta.emitTimestamp;
      wsLatency.add(latency)
    });

    socket.on('error', function(e) {
      check(e, {
	'no ws error': (e) => e.error() == "websocket: close sent", // monitor there are no errors
      });
    });
  });

  check(res, { 'connection status is 101': (r) => r && r.status === 101 }); // monitor connection is a success
};

export function measure() {
  const res = ws.connect(url, function (socket) {
    socket.setTimeout(function () {
      socket.close(); // close connection after two seconds, the ping rate is controlled by k6 in the options
    }, 2000);

    socket.on('open', () => {
      socket.ping(); // ping once by iteration
    });

    socket.on('error', function(e) {
      check(e, {
	'no ws error': (e) => e.error() == "websocket: close sent", // monitor there are no errors
      });
    });
  });

  check(res, { 'connection status is 101': (r) => r && r.status === 101 }); // monitor connection is a success
}
