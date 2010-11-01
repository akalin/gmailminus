MailState.prototype.clear = function() {
  this.email = null;
  this.mail_count = null;
  this.last_updated = null;
  this.request_failures = 0;
}

function MailState(index) {
  this.index = index;
  this.clear();
}
