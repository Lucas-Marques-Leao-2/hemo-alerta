.PHONY: docker-dev-start
docker-dev-start:
	docker compose -p hemo -f docker/dev/docker-compose.yaml up -d

.PHONY: docker-dev-stop
docker-dev-stop:
	docker compose -p hemo -f docker/dev/docker-compose.yaml down

.PHONY: docker-dev-rebuild
docker-dev-rebuild:
	docker compose -p hemo -f docker/dev/docker-compose.yaml down
	docker compose -p hemo -f docker/dev/docker-compose.yaml up -d
