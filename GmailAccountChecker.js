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
  this.on_change();
}

MailState.prototype.fail = function() {
  this.email = null;
  this.mail_count = null;
  this.last_updated = null;
  ++this.request_failures;
  this.on_change();
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

MailState.prototype.schedule = function() {
  var pollIntervalMin = 1000 * 60;  // 1 minute
  var pollIntervalMax = 1000 * 60 * 60;  // 1 hour
  var randomness = Math.random() * 2;
  var exponent = Math.pow(2, this.request_failures);
  var delay = Math.min(randomness * pollIntervalMin * exponent,
                       pollIntervalMax);
  delay = Math.round(delay);

  var self = this;
  this.pending_request =
    window.setTimeout(function() { self.get_inbox_count(); }, delay);
}

MailState.prototype.get_inbox_count = function() {
  var xhr = new XMLHttpRequest();
  var requestTimeout = 1000 * 2;  // 5 seconds
  var abortTimerId = window.setTimeout(function() {
    xhr.abort();  // synchronously calls onreadystatechange
  }, requestTimeout);

  var self = this;
  function runHandler(xml) {
    window.clearTimeout(abortTimerId);
    self.parse_feed(xml);
    if (this.pending_request) {
      window.clearTimeout(pending_request);
    }
    self.schedule();
  }

  try {
    xhr.onreadystatechange = function() {
      if (xhr.readyState != 4)
        return;

      runHandler(xhr.responseXML);
    }

    xhr.onerror = function(error) {
      runHandler(null);
    }

    xhr.open("GET", this.get_feed_url(), true);
    xhr.send(null);
  } catch(e) {
    console.error(e);
    runHandler(null);
  }
}

function MailState(index, on_change) {
  this.index = index;
  this.on_change = on_change;
  this.email = null;
  this.mail_count = null;
  this.last_updated = null;
  this.request_failures = 0;
  this.pending_request = null;
  this.get_inbox_count();
}
