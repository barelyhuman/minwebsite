/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = function (knex) {
  return knex.schema.createTable('sites', table => {
    table.increments('id').primary().notNullable()
    table.boolean('is_active').defaultTo(true)
    table.string('title').notNullable()
    table.string('link').notNullable()
    table.string('category').notNullable()
    table.string('imageURL')
    table.string('backgroundColor')
    table.jsonb('dimensions').defaultTo('{}')
    table.dateTime('addedOn')
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = function (knex) {
  return knex.schema.dropTable('sites')
}
