"use strict"
require('dotenv').config();
exports.config = {
  app_name: ["redirect"],
  license_key: process.env.NEWRELIC_LICENSE,
  NEW_RELIC_APPLICATION_LOGGING_FORWARDING_ENABLED: true,
};
