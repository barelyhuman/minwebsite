-- +migrate Up
create table links (
    id INTEGER primary key autoincrement,
    link varchar unique,
    title varchar,
    category varchar,
    image_url varchar
);

-- +migrate Down
drop table links;
