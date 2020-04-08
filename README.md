# load test boilerplate

## Prerequisite

- [Node.js](https://nodejs.org/en/) installed (use can use [nvm](https://github.com/nvm-sh/nvm) to do so)
- [Docker](https://docs.docker.com/get-docker/) installed
- [Docker Compose](https://docs.docker.com/compose/install/) installed

## Tools

- [k6](https://k6.io/docs/)
- [InfluxDb](https://www.influxdata.com/products/influxdb-overview/)
- [Grafana](https://grafana.com/grafana/)

## What does the boilerplate add?

- A json to configure your dashboard in grafana (`./visualisation`)
- A docker-compose file that binds the tools together
- A simple node js scripts that computes the maximum number of concurrent users before tested applications becomes slow (`./analyse`)
- A json file that let you configure the previous script (`./analyse`)
- A json file with default options for a scenario (`./scripts`)
- This README with some commands to run

## Perform a test

- start docker containers `docker-compose up -d` (make sure ports of docker-compose are available: 3000)
- create an HAR from Chrome (precise instructions [here](https://k6.io/docs/using-k6/session-recording-har-support#1--record-a-har-file)), put it into `./scripts`
- convert the HAR into a scenario, you will need to give it a name and to provide a white list of domain names:
    `docker-compose run --rm k6 convert -O /scripts/my-scenario.js --only my-dns-domain-name --enable-status-code-checks --options /scripts/options.json /scripts/my.domain.har`
- run the test: `dc run --rm k6 run /scripts/my-scenario.js`
- connect to [http://localhost:3000](http://localhost:3000) you should see Grafana UI
- import the dashboard:
  - copy content of `./visualisation/grafana-dashboard-config-to-import.json` (`cat ./visualisation/grafana-dashboard-config-to-import.json | pbcopy`)
  - click "+" > click "import" > paste json content > click "Load" > click "Import"
- find the maximum of concurent users:
  - in `./analyse` run `npm install`
  - in Grafana:
    - zoom to have your whole test visible
    - copy to `from` and `to` query param
  - in `./analyse/find-concurrent-user-limit-params.json`:
    - paste values to the `beginEpochNanoSeconds` and `endEpochNanoSeconds` fields
    - update the defaultTimeThreshold in milliseconds
    - (optionnal) update `timeThresholdMappedByUrls` with urls as keys and milliseconds as value
  - run `node find-concurrent-user-limit.js`
