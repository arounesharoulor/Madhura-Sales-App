const { AsyncLocalStorage } = require('async_hooks');

const tenantStorage = new AsyncLocalStorage();

const getTenant = () => {
  return tenantStorage.getStore();
};

module.exports = { tenantStorage, getTenant };
