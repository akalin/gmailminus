MailState.prototype.update = function(email, count) {
  this.email = email;
  this.mail_count = count;
  this.last_updated = null;
  this.request_failures = 0;
}

MailState.prototype.fail = function() {
  this.email = null;
  this.mail_count = null;
  this.last_updated = null;
  ++this.request_failures;
}

function MailState(index) {
  this.index = index;
  this.email = null;
  this.mail_count = null;
  this.last_updated = null;
  this.request_failures = 0;
}
