$(function () {
  // if user is running mozilla then use it's built-in WebSocket
  window.WebSocket = window.WebSocket || window.MozWebSocket;

  const getWsUri = function() {
    let wsHost = $('#hostInput').val() || '192.168.178.30';
    let wsPort = $('#portInput').val() || '8080';
    return "ws://" + wsHost + ":" + wsPort;
  }

  const WsConnection = function() {
    const connection = new WebSocket(getWsUri());
    connection.onopen = function () {
      // connection is opened and ready to use
      $('#status').replaceWith("connected to " + getWsUri());
    };

    connection.onerror = function (error) {
      // an error occurred when sending/receiving data
      $('#status').replaceWith("error!");
    };

    connection.onclose = function (error) {
      // an error occurred when sending/receiving data
      $('#status').replaceWith("Disconnected");
    };

    connection.onmessage = function (message) {
      // try to decode json (I assume that each message
      // from server is json)
      try {
        let msg = JSON.parse(message.data);
        let event = new CustomEvent('data-received', { bubbles: true, detail: { msg: msg}});
        container.dispatchEvent(event);
      } catch (e) {
        console.log(e);
        console.log(message.data);
        return;
      }
      // handle incoming message
    };
    return connection;
  }

  const Dashboard = function() {
    // plotly layout
    let layout = {
      width: 720,
      height: 400,
      margin: { t: 25, b: 25, l: 25, r: 25 },
      grid: { rows: 1, columns: 2, pattern: "independent" },
      template: {
        data: {
        }
      }
    };

    let pointsCount = 0;
    const pointsThreshold = 200;

    const plotly = Plotly.newPlot('plotly', 0, layout);
    const plotlySeries = Plotly.plot('plotly_series',[{ y: [0], type: 'line'}]);

    const plotlyData = function(energyAverage, prevEnergyAverage) {
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
    };

    return {
      updatePlotly: function(energyAverage, prevEnergyAverage) {
        const data = plotlyData(energyAverage, prevEnergyAverage);
        Plotly.react('plotly', data, layout);
        Plotly.extendTraces('plotly_series',{y: [[energyAverage]]}, [0]);
        pointsCount++;
        if (pointsCount > pointsThreshold) {
          Plotly.relayout('plotly_series', {xaxis: { range: [pointsCount - pointsThreshold, pointsCount]}})
        }
      }
    }
  }

  const statCalc = function() {
    let energyAverages = [];
    let prevEnergyAverage = 0;
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
      // $('#e span').text(energyAverage.toFixed(3));
      noiseDashboard.updatePlotly(energyAverage, prevEnergyAverage, stdDev);
      // updateHighcharts(energyAverage, prevEnergyAverage, stdDev);
      prevEnergyAverage = energyAverage;
      energyAverages.length = 0;
    };

    return {
      updateEnergy: updateEnergy,
      normalizeEnergy: normalizeEnergy,
      energyAverages: energyAverages
    }
  };

  let socket = WsConnection();
  let noiseDashboard = Dashboard();
  const stats = statCalc();

  const timerDelay = 250;

  let updateInterval = setInterval(stats.updateEnergy, timerDelay);

  container.addEventListener('data-received', function(event) {
    let msg = event.detail.msg;
    let eNorm = stats.normalizeEnergy(msg.src);
    if (eNorm !== undefined) {
      eNorm = Math.sqrt(eNorm) * 150;
      stats.energyAverages.push(eNorm);
    }
  });

  $('#connectBtn').click(function() { socket = WsConnection()});
  $('#disconnectBtn').click(function() { socket.close(); clearInterval(updateInterval); });
});
