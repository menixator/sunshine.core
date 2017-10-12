const request = require("request");
const crypto = require("crypto");
const debug = require("debug");
const { URL } = require("url");
const formatter = require("../formatter");

class BaseRequest {
  constructor({
    service,
    method,
    token,
    host,
    statusCodes,
    segments,
    ...extra
  }) {
    this.host = host || BaseRequest.HOST;
    this.basePath = "services";
    this.token = token || null;
    this.service = service;
    this.method = (method || "get").toUpperCase();
    this.extra = extra;

    this.extra.qs = this.extra.qs || {};

    this.version = 100;
    this.url = null;
    this.segments = segments || [];
    this.compiled = false;
    if (statusCodes) {
      this.statusCodes = [].concat(statusCodes) || [];
    } else {
      this.statusCodes = [];
    }
    this.log = formatter(
      "sunshine:req:" + this.constructor.name.toLowerCase()
    );
  }

  getISOTime(date) {
    if (!date) date = new Date();
    return date.toISOString().replace(/\.\d+Z$/, "");
  }

  prepareUrl() {
    this.url = [
      this.host,
      this.basePath,
      this.service,
      this.version,
      ...this.segments
    ].join("/");

    if (this.token !== null) {
      this.log`token key is ${this.token.key}`;
      let signature = crypto.createHmac("sha1", this.token.key);
      // 2017-10-10T08:52:41
      signature.update(this.method.toLowerCase());
      signature.update(this.service.toLowerCase());

      // The Date.now() feature is too accurate . . .  so I had to add 1 second to it.
      let timestamp = this.getISOTime(new Date(Date.now() + 5000));
      this.extra.qs["timestamp"] = timestamp;
      signature.update(timestamp);
      signature.update(this.token.identifier.toLowerCase());

      let hmac = signature.digest("base64");

      this.log`signing request: ${hmac}`;
      this.extra.qs["signature-method"] = "auth";
      this.extra.qs["signature-version"] = this.version;
      this.extra.qs["signature"] = hmac;
    }
  }

  compile(force = false) {
    if (this.compiled && !force) {
      throw new Error("already compiled");
    }
    if (this.url === null) {
      this.prepareUrl();
    }

    let args = Object.assign(this.extra, {
      url: this.url,
      method: this.method
    });

    this.args = args;
    this.compiled = true;
    return args;
  }

  async perform() {
    let start;

    return new Promise((resolve, reject) => {
      if (!this.compiled) this.compile();
      start = Date.now();
      this.log`requesting url: ${`${this.method} ${new URL(this.url).pathname}`}`;
      request(this.args, (err, res) => {
        if (err) return reject(err);
        return resolve(res);
      });
    }).then(async res => {
      this
        .log`response recieved. statusCode=${res.statusCode}, duration=${Date.now() -
        start} ms`;
      if (
        this.statusCodes.length > 0 &&
        this.statusCodes.indexOf(res.statusCode) === -1
      ) {
        throw new Error(`unexpected statusCode`);
      }
      return await this.handleResponse(res);
    });
  }

  handleResponse(res) {
    return res;
  }
}

BaseRequest.HOST = "http://com.sunny-portal.de";

module.exports = BaseRequest;
