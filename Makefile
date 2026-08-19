docker-dev-start:
	docker compose -f docker/dev/docker-compose.yaml up -d

docker-dev-stop:
	docker compose -f docker/dev/docker-compose.yaml down


docker-dev-rebuild:
	docker compose -f docker/dev/docker-compose.yaml down
	docker compose -f docker/dev/docker-compose.yaml up -d