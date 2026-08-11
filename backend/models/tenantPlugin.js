const { getTenant } = require('../middleware/tenantContext');

module.exports = function tenantPlugin(schema) {
  schema.pre(/^find/, function (next) {
    const tenant = getTenant();
    if (tenant && tenant.companyId) {
      this.where({ companyId: tenant.companyId });
    }
    next();
  });

  schema.pre(/^count/, function (next) {
    const tenant = getTenant();
    if (tenant && tenant.companyId) {
      this.where({ companyId: tenant.companyId });
    }
    next();
  });

  schema.pre(/^update/, function (next) {
    const tenant = getTenant();
    if (tenant && tenant.companyId) {
      this.where({ companyId: tenant.companyId });
    }
    next();
  });

  schema.pre(/^delete/, function (next) {
    const tenant = getTenant();
    if (tenant && tenant.companyId) {
      this.where({ companyId: tenant.companyId });
    }
    next();
  });

  schema.pre('save', function (next) {
    const tenant = getTenant();
    if (tenant && tenant.companyId && !this.companyId) {
      this.companyId = tenant.companyId;
    }
    next();
  });
};
