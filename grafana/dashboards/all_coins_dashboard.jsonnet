local coinTemplate = import './templates/coinTemplate.jsonnet';
local coins = import './../../lib/all-coins.json';

{
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
        coinTemplate(x, coins[x-1].coin, coins[x-1].name  , 'USD')
        for x in std.range(1, std.length(coins))
      ],
      "repeat": null,
      "repeatIteration": null,
      "repeatRowId": null,
      "showTitle": false,
      "title": "Dashboard Row",
      "titleSize": "h6"
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
  "title": "All Coins",
  "version": 8
}