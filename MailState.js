MailState.prototype.get_gmail_url = function() {
  return "https://mail.google.com/mail/u/" + this.index + "/";
}

MailState.prototype.get_feed_url = function() {
  return this.get_gmail_url() + "feed/atom/";
}

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

function gmailNSResolver(prefix) {
  if(prefix == 'gmail') {
    return 'http://purl.org/atom/ns#';
  }
}

MailState.prototype.parse_feed = function(xml) {
  if (!xml) {
    this.fail();
    return;
  }
  var titleSet = xml.evaluate("/gmail:feed/gmail:title",
      xml, gmailNSResolver, XPathResult.ANY_TYPE, null);
  var titleNode = titleSet.iterateNext();
  if (!titleNode) {
    this.fail();
    return;
  }
  title = titleNode.textContent;
  var match = /^Gmail - Inbox for (\S+)$/.exec(title);
  email = match[1];

  var fullCountSet = xml.evaluate("/gmail:feed/gmail:fullcount",
      xml, gmailNSResolver, XPathResult.ANY_TYPE, null);
  var fullCountNode = fullCountSet.iterateNext();
  if (!fullCountNode) {
    this.fail();
    return;
  }
  fullCount = parseInt(fullCountNode.textContent);
  this.update(email, fullCount);
}

function MailState(index) {
  this.index = index;
  this.email = null;
  this.mail_count = null;
  this.last_updated = null;
  this.request_failures = 0;
}
