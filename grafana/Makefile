
.PHONY: run
run: cleanup dashboard_json docker
	docker rm -f grafana || true
	docker run -d -p 3000:3000 --name grafana local/grafana


.PHONY: cleanup
cleanup:
	@rm -rf tmp 
	@mkdir -p tmp/dashboards

.PHONY: docker
docker: Dockerfile grafana.ini add_datasources.sh wrapper.sh
	docker pull grafana/grafana:latest
	docker build -t local/grafana .

.PHONY: dashboard_json
dashboard_json: $(wildcard dashboards/*.jsonnet)
	for js in $^; do \
		out=`echo $$js | sed 's/.jsonnet/.json/'`; \
		jsonnet -o tmp/$$out $$js; \
	done
