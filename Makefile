include .env
export

APP_NAME="minweb"

build:
	pnpm build

dev:
	pnpm dev

start:
	pm2 start --name=${APP_NAME} npm -- start --port=${PORT}

stop:
	pm2 stop ${APP_NAME}

deploy:
	./.deploy/local-deploy

logs:
	pm2 logs ${APP_NAME}

kill:
	pm2 del ${APP_NAME}
