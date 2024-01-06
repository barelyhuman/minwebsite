include .env
export

air="github.com/cosmtrek/air"

setup:
	go mod tidy

db.migrate:
	go run github.com/rubenv/sql-migrate/sql-migrate up

db.new:
	go run github.com/rubenv/sql-migrate/sql-migrate new $(name)

db.push:
	go run github.com/rubenv/sql-migrate/sql-migrate redo

db.rollback:
	go run github.com/rubenv/sql-migrate/sql-migrate down

deploy:
	./.deploy/local-deploy

dev:
	go run $(air)