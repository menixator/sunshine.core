const joi = require("joi");
require("dotenv").config();

class ConfigurationBucket {
  constructor() {
    this.src = Object.create(null);
  }

  get(key, def) {
    if (this.has(key)) {
      return this.src[key];
    }
    return def;
  }

  has(key, def) {
    return {}.hasOwnProperty.call(this.src, key);
  }

  fromEnv(env) {
    env = env || process.env;
    const { error, value: envVars } = joi.validate(
      env,
      ConfigurationBucket.ENV_SCHEMA
    );
    if (error) {
      console.error(error);
      throw error;
    }
    Object.assign(this.src, {
      env: envVars.NODE_ENV,
      port: envVars.SUNNY_PORT,
      host: envVars.SUNNY_HOST,
      username: envVars.SUNNY_USERNAME,
      password: envVars.SUNNY_PASSWORD
    });
    return this;
  }

  fromArgs(args) {
    args = args || {};
    const { error, value: envVars } = joi.validate(
      args,
      ConfigurationBucket.ARG_SCHEMA
    );
    if (error) throw error;

    this.parseEssentialEnv(process.env);

    Object.assign(this.src, envVars);
    return this;
  }

  parseEssentialEnv(env) {
    env = env || process.env;
    const { error, value: envVars } = joi.validate(
      env,
      ConfigurationBucket.ARG_SCHEMA
    );
    if (error) throw error;
    Object.assign(this.src, {
      env: envVars.NODE_ENV
    });
    return this;
  }
}

ConfigurationBucket.ENV_SCHEMA = joi
  .object({
    NODE_ENV: joi
      .string()
      .allow(["development", "production", "test", "provision"])
      .default("development"),
    SUNNY_PORT: joi.number().default(0),
    SUNNY_HOST: joi
      .string()
      .ip({
        version: ["ipv4", "ipv6"],
        cidr: "forbidden"
      })
      .default("0.0.0.0"),
    SUNNY_USERNAME: joi
      .string()
      .email()
      .required(),
    SUNNY_PASSWORD: joi.string().required()
  })
  .unknown()
  .required();

ConfigurationBucket.ARG_SCHEMA = joi.object({
  host: joi
    .string()
    .ip({
      version: ["ipv4", "ipv6"],
      cidr: "forbidden"
    })
    .default("0.0.0.0"),
  port: joi.number().default(0),
  username: joi
    .string()
    .email()
    .required(),
  password: joi.string().required()
});

ConfigurationBucket.ESSENTIAL_ENV = joi.object({
  NODE_ENV: joi
    .string()
    .allow(["development", "production", "test", "provision"])
    .default("development")
});

module.exports = new ConfigurationBucket();
