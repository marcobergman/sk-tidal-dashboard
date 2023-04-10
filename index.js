/*
 * Copyright 2022 Marco Bergman <marcobergman@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


const PLUGIN_ID = 'sk-tidal-dashboard';

const {
  initialiseStations,
  updateStations,
  downloadStationData
} = require('./tidaldata')


module.exports = function(app) {

  const plugin = {};
  let onStop = []
  var unsubscribes = [];

  plugin.id = PLUGIN_ID
  plugin.name = "SignalK Tidal Dashboard"
  plugin.description = "SignalK node server plugin that reads tidal data from the internet and displays it in a web app."



  plugin.start = function(options, restartPlugin) {

	app.debug(PLUGIN_ID + 'Plugin started'); 

	initialiseStations(app, options)
	downloadStationData(app, options)
	updateStations(app, options)

	let localSubscription = {
	  context: 'vessels.self', // Get data for self
	  subscribe: [{
	    path: 'navigation.position', 
	    period: 5000 // Every 5000ms
	  }]
	};

	var lastUpdate = Date.now();
	var lastDownload = Date.now();

	app.subscriptionmanager.subscribe(
	  localSubscription,
	  unsubscribes,
	  subscriptionError => {
	    app.error('Error:' + subscriptionError);
	  },
	  delta => {
	    delta.updates.forEach(u => {
		elapsedSeconds = (Date.now() - lastUpdate)/1000;
		if (elapsedSeconds > options.updateInterval) {
			updateStations(app, options)
			lastUpdate = Date.now()
		}
		elapsedSeconds = (Date.now() - lastDownload)/1000;
		if (elapsedSeconds > options.downloadInterval) {
			downloadStationData(app, options)
			lastDownload = Date.now()
		}
	    });
	  }
	);
	
  }; //plugin start



  plugin.stop = function() {
    unsubscribes.forEach(f => f());
    unsubscribes = [];
    app.setPluginStatus("Plugin stopped.");
  };  // plugin.stop



  plugin.schema = {
    type: "object",
    properties: {

      updateInterval: {
        type: 'number',
        title: 'Update interval for the water levels into signalk (seconds)',
	      description: 'The granularity of the water level data is 10 minutes. However, the update frequency should be smaller, to update right after the new data is valid.',
        default: 60},

      downloadInterval: {
        type: 'number',
        title: 'Download interval for downloading the CSV files with tidal data (seconds).',
        default: 3600},

      devices: {
        type: 'array',
        title: 'Tidal Stations',

        items: {
          type: 'object',
          properties: {
            stationName: {
              type: 'string',
              title: 'Station name'
            },
	    enabled: {
		type: 'boolean',
		title: 'Enabled',
		default: true
		},
            sourceType: {
              type: 'number',
              title: 'Source type (normally 1)',
              default: 1
            },
            csvFileName: {
              type: 'string',
              title: 'CSV file name',
              default: '*.csv'
            },
            stationLat: {
              type: 'number',
              title: 'Station latitude'
            },
            stationLon: {
              type: 'number',
              title: 'Station longitude'
            },
            urlSuffix: {
              type: 'string',
              title: 'URL suffix',
              default: ''
            }
          }  //properties
        }  //items
      } //devices
    }
  }  // plugin schema



  function subscription_error(err) {
    app.setPluginError(err)
  }

  return plugin;
}

