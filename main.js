request = require("request-promise");
express = require("express");


function getArrivals(stopID, limit) {
    return request('https://api.tfl.gov.uk/StopPoint/' + stopID + '/Arrivals')
        .then((str) => {
            let json = JSON.parse(str);
            json.sort((a, b) => a.timeToStation - b.timeToStation);
            return json.slice(0, limit);
        })
        .catch('Arrivals lookup failed.');
}

function postcodeToLatLong(postcode) {
    return request('https://api.postcodes.io/postcodes/' + postcode)
        .then((str) => {
            let json = JSON.parse(str);
            return {
                long: json.result.longitude,
                lat: json.result.latitude
            };
        })
        .catch((err) => {
            throw new Error('Bad postcode');
        });
}

function getNearestStations(types, lat, long, radius, limit) {
    let typeMap = {
        'bus': 'NaptanPublicBusCoachTram',
        'tube': 'NaptanMetroStation'
    };
    return request("https://api.tfl.gov.uk/StopPoint/?lat=" + lat + "&lon=" + long + "&stopTypes=" + types.map((type) => typeMap[type])
            .join(",") + "&radius=" + radius) // NaptanPublicBusCoachTram&radius=200&modes=bus  NaptanMetroStation
        .then((str) => {
            let json = JSON.parse(str);
            return json.stopPoints.slice(0, limit);
        })
        .catch((err) => {
            throw new Error('Bus stop lookup failed');
        })
}

app = express();

app.get('/departureBoards', (req, res) => {
    postcodeToLatLong(req.query.postcode)
        .then((loc) => getNearestStations(req.query.types.split(','), loc.lat, loc.long, req.query.radius, 2))
        .then((stops) => {
            if (stops.length === 0) {
                let err = new Error('No stops found.');
                err.returnCode = 200;
                throw err
            }
            let promises = [];
            for (stop of stops) {
                promises.push(getArrivals(stop.id, 5))
            }
            Promise.all(promises)
                .then((json) => {
                    var outputJSON = {};
                    outputJSON.success = true;
                    outputJSON.stops = json.map((stopArrivals, i) => {
                        return {
                            name: stops[i].commonName,
                            arrivals: stopArrivals.map((arrival) => {
                                return {
                                    lineName: arrival.lineName,
                                    destinationName: arrival.destinationName,
                                    timeToStation: arrival.timeToStation
                                };
                            })
                        };
                    });
                    res.send(outputJSON);
                });
        })
        .catch((err) => {
            var outputJSON = {};
            outputJSON.success = false;
            outputJSON.errorMessage = err.message;
            res.send(outputJSON);
        })
});

app.use(express.static('frontend'));

app.listen(8080, () => console.log('HTTP server running.'));