const fs = require('fs')
const csv = require('fast-csv');
const date = require('date-and-time')
const https = require('https');

const LOOKING_FOR_CURRENT_LEVEL = 1
const LOOKING_FOR_NEXT_EXTREME = 2
const NOT_LOOKING_ANYMORE = 3
const RISING = "HW"
const FALLING = "LW"

var stationList = []

function roundToNearestMinute(date = new Date()) {
  const minutes = 10;
  const ms = 1000 * 60 * minutes;

  return new Date(Math.round(date.getTime() / ms) * ms);
}


function initialiseStations (app, options) {

	app.debug ("Initialising SignalK with tidal stations fixed data.")

	stationList = []

	options.devices.forEach(device => {
		message = {context: 'aton.' + device.stationName, updates: [ {values:
                        [ { path: 'navigation.position', value: {latitude: device.stationLat, longitude: device.stationLon} },
			  { path: 'environment.nextExtreme', value: ""},
			  { path: 'environment.tidalTrend', value: "" }
			 ] } ] }
                app.handleMessage('my-signalk-plugin', message)
                stationList.push(device.stationName)
	})
}



function updateStations(app) {
	app.debug ("Updating tidal stations current waterlevels from downloaded files into SignalK.")
	timestampNow = new Date()
	dateNow = date.format(roundToNearestMinute(timestampNow), "DD-M-YYYY")
	timeNow = date.format(roundToNearestMinute(timestampNow), "HH:mm:ss")
	streamState = {}
	stationList.forEach(stationName => {
		fileName = require('path').join(app.getDataDirPath(), stationName + '.csv')
		streamState[stationName] = {status: LOOKING_FOR_CURRENT_LEVEL, previousWaterLevel: 0}
		console.log ("Reading", fileName)
		fs.createReadStream(fileName)
			.pipe(csv.parse({ headers: true, delimiter: ";" }))
			.on('error', error => console.error(error))
			.on('data', row => {
				waterLevel = parseFloat(row.Verwachting)/100
				tidalTrend = waterLevel - streamState[stationName].previousWaterLevel
				tidalTrend = tidalTrend.toFixed(2)
				if (tidalTrend > 0)
					tide = RISING
				if (tidalTrend < 0)
					tide = FALLING
				if (row.Datum == dateNow && row.Tijd == timeNow) {
					console.log (stationName, "waterLevel", waterLevel)
					app.handleMessage('my-signalk-plugin', {context: 'aton.' + stationName, updates: [ {values: 
						[ { path: 'environment.depth.belowSurface', value: waterLevel },
						  { path: 'environment.tidalTrend', value: tidalTrend } ]
					} ] })
					streamState[stationName].status = LOOKING_FOR_NEXT_EXTREME
					currentTide = tide
				}
				if (streamState[stationName].status == LOOKING_FOR_NEXT_EXTREME)
					if (tide != currentTide) {
						nextExtreme = streamState[stationName].previousTimeStamp + " " + currentTide + " " + streamState[stationName].previousWaterLevel
						console.log(stationName, "nextExtreme", nextExtreme)
						app.handleMessage('my-signalk-plugin', {context: 'aton.' + stationName, updates: [ {values:
							[ { path: 'environment.nextExtreme', value: nextExtreme } ]
						} ] })
						streamState[stationName].status = NOT_LOOKING_ANYMORE
					}
				streamState[stationName].previousWaterLevel = waterLevel
				streamState[stationName].previousTimeStamp = row.Tijd.substring(0,5)
			});
	}) // forEach
} // function updateStations


function downloadStationData(app, options) {
	options.devices.forEach(device => {
		app.debug(">---- Downloading file " + device.csvFileName) 
		fileName = require('path').join(app.getDataDirPath(), device.csvFileName)
		const file = fs.createWriteStream(fileName)
		const request = https.get(options.downloadUrl + device.urlSuffix, function(response) {
			if (response.statusCode !== 200) {
				app.debug("***** " + device.csvFileName + " not OK")
				return;
			}
  			response.pipe(file);
			file.on('finish', function () {
				app.debug("----> " + device.csvFileName + " downloaded OK")
				file.close()
			})
			file.on('error', function () {
				app.debug("***** " + device.csvFileName + " NOT OK")
				file.close()
			})
		});

	})
}


module.exports = {
	initialiseStations: initialiseStations,
	updateStations: updateStations,
	downloadStationData: downloadStationData
}

