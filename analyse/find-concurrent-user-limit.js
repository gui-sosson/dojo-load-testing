const axios = require('axios')

async function getPercentileByUrlsSeries(k6InfluxDbUrl, percentile, totalGroupSeconds, beginEpochMilliSeconds, endEpochMilliSeconds) {
  const getPercentileByUrlsInfluxQuery = `SELECT percentile("value",${percentile}) FROM http_req_duration WHERE time >= ${beginEpochMilliSeconds}000000 AND time <= ${endEpochMilliSeconds}000000 GROUP BY "name",time(${totalGroupSeconds}s)`
  const response = await axios.get(k6InfluxDbUrl, {params: {q: getPercentileByUrlsInfluxQuery}})

  return response.data.results[0].series
}

function getPercentilesMappedByUrls(series) {
  const percentilesMappedByUrls = {};
  series.forEach((serie) => {
    percentilesMappedByUrls[serie.tags.name] = serie.values.map((value) => {
      return {time: value[0], percentile: value[1]}
    }).filter((value) => {return value.percentile !== null})
  })

  return percentilesMappedByUrls
}

function findFirstKoTime(timeThresholdMappedByUrls, defaultTimeThreshold, percentilesMappedByUrls) {
  const firstKoTimeMappedByUrls = {}
  Object.keys(percentilesMappedByUrls).forEach((url) => {
    const timeThreshold = timeThresholdMappedByUrls[url] || defaultTimeThreshold
    const firstKoElement = percentilesMappedByUrls[url].find((entry) => {
      return entry.percentile >= timeThreshold
    })
    firstKoTimeMappedByUrls[url] = firstKoElement ? firstKoElement.time : null
  })

  return Object.values(firstKoTimeMappedByUrls).sort()[0]
}

async function findFirstDysfunctionnalConcurrentUser(k6InfluxDbUrl, firstKoTime) {
  const getVusAtTimeInfluxQuery = `SELECT value FROM vus WHERE time <= '${firstKoTime}' ORDER BY time DESC LIMIT 1;`
  const response = await axios.get(k6InfluxDbUrl, {params: {q: getVusAtTimeInfluxQuery}})

  return response.data.results[0].series[0].values[0][1]
}

async function main() {

  const percentile = 90
  const totalGroupSeconds = 10
  const params = require('./find-concurrent-user-limit-params.json')
  const k6InfluxDbUrl = `http://localhost:8086/query?db=${params.projectName}&precision=s`

  const series = await getPercentileByUrlsSeries(
    k6InfluxDbUrl,
    percentile,
    totalGroupSeconds,
    params.beginEpochMilliSeconds,
    params.endEpochMilliSeconds
  );
  if (!series) {
    console.log('No series found during this period')
    return;
  }
  const percentilesMappedByUrls = getPercentilesMappedByUrls(series)
  const firstKoTime = findFirstKoTime(
    params.timeThresholdMappedByUrls,
    params.defaultTimeThreshold,
    percentilesMappedByUrls
  )
  if (null === firstKoTime) {
    console.log('OK')
    return
  }
  const firstDysfunctionnalConcurrentUser = await findFirstDysfunctionnalConcurrentUser(k6InfluxDbUrl, firstKoTime)
  console.log(firstDysfunctionnalConcurrentUser)
}

main()
