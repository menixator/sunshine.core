const Base = require("./base");

class Authentication extends Base {
  toJSON() {
    return {
      type: this.method === "DELETE" ? "logout" : "login",
      key: this.key,
      identifier: this.identifier
    };
  }

  parse() {
    if (this.contextNode.textContent !== "OK") {
      throw new Error("authentication failed");
    }

    let isLogIn = this.method !== "DELETE";

    this.identifier = this.attr("identifier", this.contextNode);

    // From logins.
    if (isLogIn) {
      this.log`identifier is ${this.identifier}`;
      this.key = this.attr("key", this.contextNode);
      this.log`key is ${this.key}`;
      this.log`logged in!`;
    } else {
      this.key = null;
      this.log`logged out`;
    }
  }
}

module.exports = Authentication;
