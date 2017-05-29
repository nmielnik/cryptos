FROM grafana/grafana:latest

RUN apt-get update && apt-get -y install \
  curl \
  jq

COPY grafana.ini /etc/grafana/grafana.ini
COPY add_datasources.sh add_datasources.sh
COPY wrapper.sh wrapper.sh

COPY dashboards/. /opt/grafana/data/dashboards/.

ENTRYPOINT ["/wrapper.sh"]