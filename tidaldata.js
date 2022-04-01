"use strict";

const fs = require('fs')
const csv = require('fast-csv');
const date = require('date-and-time')
const https = require('https');

const LOOKING_FOR_CURRENT_LEVEL = 1
const LOOKING_FOR_NEXT_EXTREME = 2
const NOT_LOOKING_ANYMORE = 3
const RISING = "HW"
const FALLING = "LW"


function roundToNearestMinute(date = new Date()) {
  const minutes = 10;
  const ms = 1000 * 60 * minutes;

  return new Date(Math.round(date.getTime() / ms) * ms);
}


function initialiseStations (app, options) {

	app.debug ("Initialising SignalK with tidal stations fixed data.")

	options.devices.forEach(device => {
		if (device.enabled) {
			const message = {context: 'aton.' + device.stationName, updates: [ {values:
				[ { path: 'navigation.position', value: {latitude: device.stationLat, longitude: device.stationLon} },
				  { path: 'environment.nextExtreme', value: ""},
				  { path: 'environment.tidalTrend', value: "" }
				 ] } ] }
			app.handleMessage('my-signalk-plugin', message)
		}
	})
}



function updateStations(app, options) {
	app.debug ("Updating tidal stations current waterlevels from downloaded files into SignalK.")
	const timestampNow = new Date()
	const dateNow = date.format(roundToNearestMinute(timestampNow), "D-M-YYYY")
	const timeNow = date.format(roundToNearestMinute(timestampNow), "HH:mm:ss")
	options.devices.forEach(device => {
		if (device.enabled) {
			const fileName = require('path').join(app.getDataDirPath(), device.csvFileName)
			let status = LOOKING_FOR_CURRENT_LEVEL 
			let previousWaterLevel = 0 
			let previousTimeStamp = 0 
			let waterLevel = 0 
			let tidalTrend = 0
			let tide = "??"
			let currentTide = 0
			let nextExtreme = ""
			console.log ("Reading", fileName)
			fs.createReadStream(fileName)
				.pipe(csv.parse({ headers: ["date", "time", "parameter", "location", "actual", "expectation", "astro", "unit", "height", "reference", "rest"], 
					strictColumnHandling: false, delimiter: ";", ignoreEmpty:true }))
				.on('error', error => console.error(error))
				.on('data', row => {
					waterLevel = row.actual // to set tide in case the file starts at current time
					if (row.expectation)
						waterLevel = (row.expectation > 0 ? "+" : "") + (parseFloat(row.expectation)/100).toFixed(2)
					tidalTrend = waterLevel - previousWaterLevel
					tidalTrend = (tidalTrend > 0 ? "+" : "") + tidalTrend.toFixed(2)
					if (tidalTrend > 0.01)
						tide = RISING
					if (tidalTrend < -0.01)
						tide = FALLING
					if (row.date == dateNow && row.time == timeNow) {
						console.log (device.stationName, "waterLevel", waterLevel, row.astro)
						app.handleMessage('my-signalk-plugin', {context: 'aton.' + device.stationName, updates: [ {values: 
							[ { path: 'environment.depth.belowSurface', value: waterLevel },
							  { path: 'environment.depth.astro', value: row.astro },
							  { path: 'environment.tidalTrend', value: tidalTrend } ]
						} ] })
						status = LOOKING_FOR_NEXT_EXTREME
						currentTide = tide
					}
					if (status == LOOKING_FOR_NEXT_EXTREME)
						if (tide != currentTide) {
							nextExtreme = currentTide + " " + previousTimeStamp + " " + previousWaterLevel
							console.log(device.stationName, "nextExtreme", nextExtreme)
							app.handleMessage('my-signalk-plugin', {context: 'aton.' + device.stationName, updates: [ {values:
								[ { path: 'environment.nextExtreme', value: nextExtreme } ]
							} ] })
							status = NOT_LOOKING_ANYMORE
						}
					previousWaterLevel = waterLevel
					previousTimeStamp = row.time.substring(0,5)
				});
		}
	}) // forEach
} // function updateStations


function downloadStationData(app, options) {
	options.devices.forEach(device => {
		if (device.enabled) {
			app.debug(">---- Downloading file " + device.csvFileName) 
			const fileName = require('path').join(app.getDataDirPath(), device.csvFileName)
			const file = fs.createWriteStream(fileName + ".tmp")
			const request = https.get(options.downloadUrl + device.urlSuffix, function(response) {
				if (response.statusCode !== 200) {
					app.debug("***** " + device.csvFileName + " not OK")
					return;
				}
				response.pipe(file);
				file.on('finish', function () {
					if (fs.statSync(fileName + ".tmp").size > 1000) {
						fs.rename(fileName + ".tmp", fileName, (err) => {
							if (err) throw err;
						});
						app.debug("----> " + device.csvFileName + " downloaded OK")
					}
					else
						app.debug("----X " + device.csvFileName + ".tmp too small; ignored")
					file.close()
				})
				file.on('error', function () {
					app.debug("***** " + device.csvFileName + " NOT OK")
					file.close()
				})
			});
		}	

	})
}


module.exports = {
	initialiseStations: initialiseStations,
	updateStations: updateStations,
	downloadStationData: downloadStationData
}

