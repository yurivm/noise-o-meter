# Noise-o-meter

A sample noise dashboard project as described in this medium article (insert link when done).

![](doc/mumble_diagram.png)

## Setup

Have [mumble](https://github.com/yurivm/mumble) running on the Raspberry PI.

You might need to adjust the following to use your Raspberry Pi's IP:

```
const getWsUri = function() {
  // update the IP here
    let wsHost = $('#hostInput').val() || '192.168.178.30';
    let wsPort = $('#portInput').val() || '8080';
    return "ws://" + wsHost + ":" + wsPort;
  }
```

## How it works

- the WebSocket `onmessage` callback parses JSON messages
- for each JSON message,a `CustomEvent` called `data-received` is dispatched with sound level data
- the event handler collects the data and updates the Plot.ly dashboards

## Contributing

PRs are welcome! :)
