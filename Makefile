include .env
export

setup:
	go mod tidy

deploy:
	./.deploy/local-deploy

dev:
	go generate main.go
	go run github.com/barelyhuman/gomon -w "." -exclude=".minwebinternals" .