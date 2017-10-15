const xpath = require("xpath");
const DOMParser = require("xmldom").DOMParser;
const formatter = require("../formatter");
const moment = require("moment");
const ROOT_TAG_NAME = "sma.sunnyportal.services";

class BaseReponse {
  // Parses a body as XML
  static parse(body) {
    return new DOMParser().parseFromString(body);
  }

  ptr(node) {
    let paths = [];

    let currNode = node;
    while (
      currNode &&
      currNode.nodeType !== 9 // Document
    ) {
      paths.push(currNode.tagName);
      currNode = currNode.parentNode;
    }
    paths.reverse();
    return paths.length > 0 ? "/" + paths.join("/") : "";
  }

  constructor(body, token) {
    this.log = formatter("sunshine:res:" + this.constructor.name.toLowerCase());

    this.log`parsing response`;
    this.raw = body;
    this.doc = BaseReponse.parse(body);

    this.root = this.doc.documentElement;

    if (!this.root) {
      throw new Error("root not found");
    }

    if (this.root.tagName !== ROOT_TAG_NAME) {
      throw new Error(
        `malformed response. root tagname is not ${ROOT_TAG_NAME}`
      );
    }

    let serviceNode = this.findOne("service");

    let service = this.attr(
      ["name", "method", "version", "request-oid", "creation-date"],
      serviceNode
    );

    this.serviceName = service.name;
    this.method = service.method.toUpperCase();
    this.version = service.version;
    this.requestOid = service["request-oid"];
    this.creationDateString = service["creation-date"];
    this.log`creation-date: ${this.creationDateString}`;

    let createdMoment = moment(this.creationDateString, "MM/DD/YYYY h:mm:ss A");

    this.creationDate = createdMoment.valueOf();
    this.deltaValue = moment().diff(createdMoment);
    // if (token) {
    //   token.deltaValue = this.deltaValue;
    //   this.log`delta value was refreshed to ${this.deltaValue}`;
    // } else {
    // }
    this.log`server timestamp delta is ${this.deltaValue} ms`;

    this.error = null;

    let error = xpath.select1("error", serviceNode);

    if (error) {
      let err = new Error(this.findOne("message", error).textContent);
      err.code = this.findOne("code", error).textContent;


      this.log`API Error: ${err}`;

      throw err;
    }

    this.contextNode = this.findOne(service.name, serviceNode);

    this.ok = this.error === null;

    if (this.ok) this.parse && this.parse();
  }

  parse() {}

  find(src, haystack) {
    return xpath.select1(src, haystack || this.root);
  }

  findOne(src, haystack) {
    let $el = this.findAll(src, haystack);
    if ($el.length === 0) {
      let ptr = this.ptr(haystack);
      this.log`no matches for ${src} in the node ${ptr}`;
      throw new Error(`nothing found for ${src} in ${ptr}`);
    }
    if ($el.length > 1) {
      let ptr = this.ptr(haystack);
      this.log`more than one match for ${src} in the node ${ptr}`;
      throw new Error(`more than one element found for ${src} in ${ptr}`);
    }
    return $el[0];
  }

  findChain(srcs, haystack, idx) {
    if (typeof haystack === "number") {
      idx = haystack;
      haystack = this.root;
    }

    let found = [];
    [].concat(srcs).reduce((currNode, selector) => {
      let node = this.findOne(selector, currNode);
      found.push(node);
      return node;
    }, haystack || this.roor);

    if (found.length === 0) {
      throw new Error("nothing found!");
    }

    if (typeof idx === "number") {
      if (idx < 0) {
        throw new Error("index is less than 0");
      }
      if (idx >= found.length) {
        throw new Error("index is greater than the number of found nodes");
      }
      return found[idx];
    }
    return found[found.length - 1];
  }

  findOneText(src, haystack) {
    return this.findOne(src, haystack).textContent;
  }

  findAll(src, el) {
    let haystack = el || this.root;
    let $el = xpath.select(src, haystack);
    return $el;
  }

  attr(attr, el, haystack = null) {
    if (typeof el === "string") {
      el = this.findOne(el, haystack);
    }

    let attributes = [].concat(attr);

    return attributes.reduce((map, currAttr) => {
      if (!el.hasAttribute(currAttr)) {
        throw new Error(
          `${this.ptr(el)} is missing a required attribute '${currAttr}'`
        );
      }
      let val = el.getAttribute(currAttr);
      if (attributes.length === 1) return val;
      map[currAttr] = val;
      return map;
    }, {});
  }
}

module.exports = BaseReponse;
