include .env
export

setup:
	go mod tidy

deploy:
	./.deploy/local-deploy

dev:
	go run github.com/barelyhuman/gomon -w "." -exclude="assets" .