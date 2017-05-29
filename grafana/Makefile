

.PHONY: run
run: docker
	docker rm -f grafana || true
	docker run -d -p 3000:3000 --name grafana local/grafana

.PHONY: docker
docker: Dockerfile grafana.ini add_datasources.sh wrapper.sh
	docker pull grafana/grafana:latest
	docker build -t local/grafana .
