require('ts-node/register');

const knexConfig = require('../knexfile.ts').default;
const knex = require('knex')(knexConfig.development);

async function main() {
  const dbRes = await knex.raw('select current_database() as db');
  const db = dbRes?.rows?.[0]?.db;

  const tableRes = await knex.raw(
    "select to_regclass('public.money_loan_cash_overrides') as overrides_table"
  );
  const overridesTable = tableRes?.rows?.[0]?.overrides_table;

  const migRes = await knex.raw(
    "select id, name, batch, migration_time from knex_migrations where name like '%cash_overrides%' order by id"
  );

  console.log(JSON.stringify({ db, overridesTable, matchingMigrations: migRes?.rows ?? [] }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => knex.destroy());
