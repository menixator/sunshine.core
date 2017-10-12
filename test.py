import hashlib
import hmac

import base64

sig = hmac.new('potato', digestmod=hashlib.sha1);
sig.update('test'.encode());
print(base64.standard_b64encode(sig.digest()));