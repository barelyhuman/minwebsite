include .env
export

APP_NAME="minweb"

start:
	PORT=${PORT} pm2 start 'node dist/server' --name=${APP_NAME} --update-env

stop:
	pm2 stop ${APP_NAME}

deploy:
	./.deploy/local-deploy

logs:
	pm2 logs ${APP_NAME}

kill:
	pm2 del ${APP_NAME}