function(id, coinName, title, currency) {
          "aliasColors": {},
          "bars": false,
          "dashLength": 10,
          "dashes": false,
          "datasource": "elasticsearch",
          "fill": 1,
          "id": id,
          "legend": {
            "avg": false,
            "current": false,
            "max": true,
            "min": true,
            "show": true,
            "total": false,
            "values": false
          },
          "lines": true,
          "linewidth": 3,
          "links": [],
          "nullPointMode": "null",
          "percentage": false,
          "pointradius": 2,
          "points": true,
          "renderer": "flot",
          "seriesOverrides": [
            {
              "alias": "Average close",
              "color": "#6ED0E0"
            },
            {
              "alias": "BTC",
              "yaxis": 2
            },
            {
              "alias": "USD",
              "yaxis": 1
            }
          ],
          "spaceLength": 10,
          "span": 4,
          "stack": false,
          "steppedLine": false,
          "targets": [
            {
              "alias": "USD",
              "bucketAggs": [
                {
                  "field": "time",
                  "id": "2",
                  "settings": {
                    "interval": "auto",
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
                  "id": "1",
                  "meta": {},
                  "settings": {},
                  "type": "avg"
                }
              ],
              "query": "coinName:\"" + coinName + "\" && currency:\"USD\"",
              "refId": "A",
              "timeField": "time"
            },
            {
              "alias": "BTC",
              "bucketAggs": [
                {
                  "field": "time",
                  "id": "3",
                  "settings": {
                    "interval": "auto",
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
                  "id": "5",
                  "meta": {},
                  "settings": {},
                  "type": "avg"
                }
              ],
              "query": "coinName:\"" + coinName + "\" && currency:\"BTC\"",
              "refId": "A",
              "timeField": "time"
            }
          ],
          "thresholds": [],
          "timeFrom": null,
          "timeShift": null,
          "title": coinName + ' - ' + title,
          "tooltip": {
            "shared": true,
            "sort": 0,
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