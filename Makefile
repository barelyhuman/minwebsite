include .env
export

APP_NAME="minweb"
NODE_PATH = $(shell bash -c 'source ~/.nvm/nvm.sh && nvm which 20')

build:
	npm run build

dev:
	npm run dev

start:
	pm2 start --name=${APP_NAME} --interpreter=$(NODE_PATH)  dist/server/index.js -- --port=${PORT}

stop:
	pm2 stop ${APP_NAME}

deploy:
	./.deploy/local-deploy

logs:
	pm2 logs ${APP_NAME}

kill:
	pm2 del ${APP_NAME}
