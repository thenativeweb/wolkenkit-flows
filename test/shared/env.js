'use strict';

/* eslint-disable no-process-env */
const env = {
  POSTGRES_URL_UNITS: process.env.POSTGRES_URL_UNITS || 'pg://wolkenkit:wolkenkit@local.wolkenkit.io:5433/wolkenkit',
  POSTGRES_URL_INTEGRATION: process.env.POSTGRES_URL_INTEGRATION || 'pg://wolkenkit:wolkenkit@local.wolkenkit.io:5434/wolkenkit',
  POSTGRES_URL_PERFORMANCE: process.env.POSTGRES_URL_PERFORMANCE || 'pg://wolkenkit:wolkenkit@local.wolkenkit.io:5435/wolkenkit',
  RABBITMQ_URL_INTEGRATION: process.env.RABBITMQ_URL_INTEGRATION || 'amqp://wolkenkit:wolkenkit@local.wolkenkit.io:5673'
};
/* eslint-enable no-process-env */

module.exports = env;
