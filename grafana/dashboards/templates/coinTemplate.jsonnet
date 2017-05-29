function(id, coinName, title, currency) {
          "aliasColors": {},
          "bars": true,
          "dashLength": 10,
          "dashes": false,
          "datasource": "elasticsearch",
          "fill": 1,
          "id": id,
          "legend": {
            "avg": false,
            "current": false,
            "max": false,
            "min": false,
            "show": false,
            "total": false,
            "values": false
          },
          "lines": true,
          "linewidth": 1,
          "links": [],
          "nullPointMode": "null",
          "percentage": false,
          "pointradius": 5,
          "points": false,
          "renderer": "flot",
          "seriesOverrides": [
            {
              "alias": "Average close",
              "color": "#6ED0E0"
            }
          ],
          "spaceLength": 10,
          "span": 6,
          "stack": false,
          "steppedLine": false,
          "targets": [
            {
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
              "query": "coinName:\"" + coinName + "\" && currency:\"" + currency + "\"",
              "refId": "A",
              "timeField": "time"
            }
          ],
          "thresholds": [],
          "timeFrom": null,
          "timeShift": null,
          "title": coinName + ' - ' + currency + ' - ' + title,
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