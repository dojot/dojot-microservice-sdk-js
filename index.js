const Consumer = require('./lib/kafka/Consumer');
const Producer = require('./lib/kafka/Producer');
const { Logger } = require('./lib/logging/Logger');
const ConfigManager = require('./lib/configManager');
const ServiceStateManager = require('./lib/serviceStateManager/ServiceStateManager');

module.exports = {
  Kafka: {
    Consumer,
    Producer,
  },
  Logger,
  ConfigManager,
  ServiceStateManager,
};
