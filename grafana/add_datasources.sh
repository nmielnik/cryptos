#!/bin/bash

admin_password=admin

grafana() {
  endpoint=$1
  shift
  curl --silent \
    "http://admin:${admin_password}@localhost:3000/api/${endpoint}" \
    "$@"
}

sources=$(grafana datasources | jq .[].name)

if ! <<<"$sources" grep -q elasticsearch; then
  grafana datasources \
    -X POST \
    -H 'Content-Type: application/json;charset=UTF-8' \
    --data-binary \
    '
    {
      "name":"elasticsearch",
      "type":"elasticsearch",
      "typeLogoUrl":"public/app/plugins/datasource/elasticsearch/img/elasticsearch.svg",
      "access":"proxy",
      "url":"https://search-coins-jtghe5d7qp3qk245pxfvez73hi.us-east-1.es.amazonaws.com",
      "password":"",
      "user":"",
      "database":"coins",
      "basicAuth":false,
      "isDefault":true,
      "jsonData":{
        "esVersion":5,
        "timeField":"time"
      }
    }'
fi