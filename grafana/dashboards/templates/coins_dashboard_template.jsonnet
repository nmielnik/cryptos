local coinTemplate = import './coin_template.jsonnet';

function(coins=[], title='') {
  "annotations": {
    "list": []
  },
  "editable": true,
  "gnetId": null,
  "graphTooltip": 1,
  "hideControls": true,
  "id": 1,
  "links": [],
  "rows": [
    {
      "collapse": false,
      "height": 280,
      "panels": [
        coinTemplate(x, coins[x-1].coin, coins[x-1].name, coins[x-1].currency)
        for x in std.range(1, std.length(coins)) if coins[x-1].currency == 'BTC' || coins[x-1].coin == 'BTC'
      ],
      "repeat": null,
      "repeatIteration": null,
      "repeatRowId": null,
      "showTitle": false,
      "title": "COINS",
      "titleSize": "h2"
    }
  ],
  "schemaVersion": 14,
  "style": "dark",
  "tags": [],
  "templating": {
    "list": []
  },
  "time": {
    "from": "now-24h",
    "to": "now"
  },
  "timepicker": {
    "refresh_intervals": [
      "5s",
      "10s",
      "30s",
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "2h",
      "1d"
    ],
    "time_options": [
      "5m",
      "15m",
      "1h",
      "6h",
      "12h",
      "24h",
      "2d",
      "7d",
      "30d"
    ]
  },
  "timezone": "browser",
  "title": title,
  "version": 8
}