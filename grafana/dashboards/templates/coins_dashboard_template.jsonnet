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
      "height": "800px",
      "panels": [
        {
          "aliasColors": {},
          "bars": false,
          "dashLength": 10,
          "dashes": false,
          "datasource": null,
          "fill": 1,
          "id": 2,
          "legend": {
            "alignAsTable": false,
            "avg": false,
            "current": false,
            "max": false,
            "min": false,
            "show": true,
            "total": false,
            "values": false
          },
          "lines": true,
          "linewidth": 1,
          "links": [],
          "nullPointMode": "null",
          "percentage": false,
          "pointradius": 5,
          "points": true,
          "renderer": "flot",
          "seriesOverrides": [],
          "spaceLength": 10,
          "span": 12,
          "stack": false,
          "steppedLine": false,
          "targets": [
            {
              "bucketAggs": [
                {
                  "fake": true,
                  "field": "coinName",
                  "id": "4",
                  "settings": {
                    "min_doc_count": 1,
                    "order": "desc",
                    "orderBy": "_term",
                    "size": "0"
                  },
                  "type": "terms"
                },
                {
                  "field": "time",
                  "id": "2",
                  "settings": {
                    "interval": "1d",
                    "min_doc_count": 0,
                    "trimEdges": 0
                  },
                  "type": "date_histogram"
                }
              ],
              "dsType": "elasticsearch",
              "metrics": [
                {
                  "field": "close",
                  "hide": true,
                  "id": "1",
                  "meta": {},
                  "pipelineAgg": "select metric",
                  "settings": {},
                  "type": "avg"
                },
                {
                  "field": "1",
                  "id": "3",
                  "meta": {},
                  "pipelineAgg": "1",
                  "settings": {},
                  "type": "derivative"
                }
              ],
              "query": "currency: \"BTC\"",
              "refId": "A",
              "timeField": "time"
            }
          ],
          "thresholds": [],
          "timeFrom": null,
          "timeShift": null,
          "title": "Panel Title",
          "tooltip": {
            "shared": true,
            "sort": 2,
            "value_type": "individual"
          },
          "type": "graph",
          "xaxis": {
            "buckets": null,
            "mode": "time",
            "name": null,
            "show": true,
            "values": []
          },
          "yaxes": [
            {
              "format": "short",
              "label": null,
              "logBase": 1,
              "max": null,
              "min": null,
              "show": true
            },
            {
              "format": "short",
              "label": null,
              "logBase": 1,
              "max": null,
              "min": null,
              "show": true
            }
          ]
        }
      ],
      "repeat": null,
      "repeatIteration": null,
      "repeatRowId": null,
      "showTitle": true,
      "title": "Changes",
      "titleSize": "h2"
    },
    {
      "collapse": false,
      "height": 280,
      "panels": [
        #coinTemplate(x, coins[x-1].coin, coins[x-1].name, 'USD')
        #for x in std.range(1, std.length(coins)) if std.count(coins[x-1].currencies, 'USD') == 1 || coins[x-1].name == 'BTC'
      ],
      "repeat": null,
      "repeatIteration": null,
      "repeatRowId": null,
      "showTitle": true,
      "title": "USD",
      "titleSize": "h2"
    },
    {
      "collapse": false,
      "height": 280,
      "panels": [
        coinTemplate(x, coins[x-1], coins[x-1], 'BTC')
        for x in std.range(1, std.length(coins))
      ],
      "repeat": null,
      "repeatIteration": null,
      "repeatRowId": null,
      "showTitle": true,
      "title": "BTC",
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