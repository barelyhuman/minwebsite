include .env
export

APP_NAME="minweb"

buildClient:
	npm run build

buildServer:
	go build -o app . 

build:
	$(MAKE) buildClient
	$(MAKE) buildServer


devClient:
	npm run dev

devServer:
	find **/*.{go,html,css}  | entr -sr "go run ."

dev:
	$(MAKE) -j 2 devClient devServer

start:
	PORT=${PORT} pm2 start ./app --name=${APP_NAME}

stop:
	pm2 stop ${APP_NAME}

deploy:
	./.deploy/local-deploy

logs:
	pm2 logs ${APP_NAME}

kill:
	pm2 del ${APP_NAME}