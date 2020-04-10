$(function () {
  // if user is running mozilla then use it's built-in WebSocket
  window.WebSocket = window.WebSocket || window.MozWebSocket;
  const wsServerUri = "ws://192.168.178.30:8080";

  const timerDelay = 250;
  const connection = new WebSocket(wsServerUri);

  var energyAverages = [];
  var prevEnergyAverage = 0;

  var pointsCount = 0;
  const pointsThreshold = 200;
  // trying out plotly
  var layout = {
    width: 720,
    height: 400,
    margin: { t: 25, b: 25, l: 25, r: 25 },
    grid: { rows: 1, columns: 2, pattern: "independent" },
    template: {
      data: {
      }
    }
  };
  function plotlyData(energyAverage, prevEnergyAverage) {
    const avg = energyAverage.toFixed(3);
    const delta = (energyAverage - prevEnergyAverage ).toFixed(3);
    let barColor = "green";
    if (avg >= 25 && avg < 60) {
      barColor = "yellow"
    } else if (avg >= 60) {
      barColor = "red";
    }

    return [
      {
        type: "indicator",
        mode: "gauge+number+delta",
        value: avg,
        title: {text: 'Noise Level', font: {size: 20}},
        delta: { reference: prevEnergyAverage },
        gauge: {
          axis: {
            range: [0, 80],
            tickwidth: 1,
            tickcolor: "darkblue"
          },
          bar: { color: barColor },
        },
        domain: { row: 0, column: 0 }
      },
    ];
  }

  const updatePlotly = function(energyAverage, prevEnergyAverage) {
    const data = plotlyData(energyAverage, prevEnergyAverage);
    Plotly.react('plotly', data, layout);
    Plotly.extendTraces('plotly_series',{y: [[energyAverage]]}, [0]);
    pointsCount++;
    if (pointsCount > pointsThreshold) {
      Plotly.relayout('plotly_series', {xaxis: { range: [pointsCount - pointsThreshold, pointsCount]}})
    }
  }

  const normalizeEnergy = function(src) {
    let intensities = 0.0;
    src.forEach(function(x) {
      intensities = intensities + x.E * x.E;
    });
    return intensities;
  };

  const calcMean = function() {
    return energyAverages.reduce((a,b) => a + b, 0) / energyAverages.length;
  };

  const calcStdDev = function(mean, length) {
    return Math.sqrt(energyAverages.reduce((sq,b) => sq + (b - mean) * (b - mean)) / length);
  };

  const updateEnergy = function() {
    const energyAverage = calcMean();
    const stdDev = calcStdDev(energyAverage, energyAverages.length);
    energyAverages = [];
    // $('#e span').text(energyAverage.toFixed(3));
    updatePlotly(energyAverage, prevEnergyAverage, stdDev);
    // updateHighcharts(energyAverage, prevEnergyAverage, stdDev);
    prevEnergyAverage = energyAverage;
  }

  connection.onopen = function () {
    // connection is opened and ready to use
    $('#status').replaceWith("<h4>connected to " + wsServerUri + "</h4>");
  };

  connection.onerror = function (error) {
    // an error occurred when sending/receiving data
    $('#status').replaceWith("<h4>error!</h4>");
  };

  connection.onmessage = function (message) {
    // try to decode json (I assume that each message
    // from server is json)
    try {
      let msg = JSON.parse(message.data);
      let eNorm = normalizeEnergy(msg.src);
      if (eNorm !== undefined) {
        eNorm = Math.sqrt(eNorm);
        energyAverages.push(150 * eNorm);
      }
      //console.log(energyAverages);
    } catch (e) {
      console.log(e);
      console.log(message.data);
      return;
    }
    // handle incoming message
  };
  setInterval(updateEnergy, timerDelay);
  Plotly.newPlot('plotly', plotlyData(0,0), layout);
  Plotly.plot('plotly_series',[{ y: [0], type: 'line'}]);

});
