function secondsToString(seconds) {
    if (seconds < 30) {
        return 'Due';
    }
    let time_string = ""
    if (seconds > 3600) {
        time_string += Math.floor(seconds / 3600) + " h, "
        seconds = seconds % 3600
    }
    if (seconds > 60) {
        time_string += Math.floor(seconds / 60) + " min"
        seconds = seconds % 60
    } else {
        return '< 1 min';
    }
    //time_string += seconds + " seconds.";
    return time_string;
}

let TYPE = 'bus';
let RADIUS = 200;
let POSTCODE = null;
let STOPS = null;
REQUEST_ID = 0;

function updateBoard() {
    var html = '';
    for (stop of STOPS) {
        html += `<div class="stop">`;
        html += `<div class="stopName">${stop.name}</div>`;
        if (stop.arrivals.length === 0) {
            html += "<div class=\"arrival\">NO BUSES</div>";
        } else {
            html += `${stop.arrivals.map((arrival) => {
                            return `<div class="arrival">
                            <span class="lineName">${arrival.lineName}</span><br />
                            <span class="destination">towards ${arrival.destinationName}</span><br />
                            <span class="timeToStation">${secondsToString(arrival.timeToStation)}</span>
                            </div>`}).join('')}`;
        }
        html += '</div>';
    }
    document.getElementById('results')
        .innerHTML = html;

}

function onTick() {
    if (STOPS) {
        for (stop of STOPS) {
            for (arrival of stop.arrivals) {
                arrival.timeToStation--;
            }
        }
        updateBoard()
        COUNTER++;
        if (COUNTER % 30 == 0 && !REQUEST_IN_FLIGHT) {
            fetch();
        }
    }
}

setInterval(onTick, 1000);
COUNTER = 0;

function fetch() {
    if (POSTCODE) {
        document.getElementById('results')
            .innerHTML = '<h2 class="rotate">Loading...</h2>';

        var url = '/departureBoards?postcode=' + POSTCODE + '&types=' + TYPE + '&radius=' + RADIUS
        var xhttp = new XMLHttpRequest();

        xhttp.open('GET', url, true);

        REQUEST_ID++;
        let req_id = REQUEST_ID;
        REQUEST_IN_FLIGHT = true;
        COUNTER = 0;

        xhttp.onload = function() {
            if (REQUEST_ID > req_id) {
                return;
            }
            REQUEST_IN_FLIGHT = false
            let json = JSON.parse(xhttp.responseText);
            if (json.success) {
                STOPS = json.stops.slice(0, 2);
                updateBoard();
            } else {
                document.getElementById('results')
                    .innerHTML = "<h3 class=\"error\">" + json.errorMessage + "</h3>";
                STOPS = null;
            }
        }

        xhttp.send();
    }
}

function switchType() {
    if (TYPE === 'bus') {
        TYPE = 'tube';
    } else {
        TYPE = 'bus';
    }
    var titleMap = { 'bus': 'BusBoard', 'tube': 'TubeBoard' };
    document.getElementById('title')
        .innerHTML = titleMap[TYPE];
    document.title = titleMap[TYPE];
    fetch();
}

function radiusChanged() {
    RADIUS = document.getElementById('radius-field')
        .value;
    document.getElementById('radius-display')
        .innerHTML = RADIUS + 'm';
    fetch();
}

function postcodeSubmitted() {
    POSTCODE = document.getElementById('postcode-field').value.toUpperCase();
    POSTCODE = POSTCODE.replace(/\s/g, '')
    let regex = /^([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([AZa-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9]?[A-Za-z]))))[0-9][A-Za-z]{2})$/;
    if (POSTCODE.match(regex)) {
        POSTCODE = POSTCODE.substring(0,POSTCODE.length - 3) + ' ' + POSTCODE.substr(-3);
        document.getElementById('postcode-field')
            .value = POSTCODE;
        fetch();
    } else {
        POSTCODE = null;
        STOPS = null;
        document.getElementById('results').innerHTML = "<h3 class=\"error\">" + "Bad Postcode" + "</h3>";
    }
}

function postcodeChangeCancelled() {
    document.getElementById('postcode-field')
        .value = POSTCODE;
}