function GmailAccountChecker(index, onUpdate) {
  this.onUpdate_ = onUpdate;
  this.lastUpdated_ = null;
  this.requestFailures_ = 0;
  this.pendingRequestTimerId_ = null;

  this.index = index;
  this.email = null;
  this.unreadCount = null;

  this.startCheck();
}

GmailAccountChecker.prototype.startCheck = function() {
  var xhr = new XMLHttpRequest();

  var requestTimeout = 5 * 1000;  // 5 seconds
  var abortTimerId = window.setTimeout(function() {
    xhr.abort();  // synchronously calls xhr.onreadystatechange
  }, requestTimeout);

  var self = this;

  var onSuccess = function() {
    window.clearTimeout(abortTimerId);
    self.parse_feed(xhr.responseXML);
    self.schedule();
  }

  var onFailure = function() {
    window.clearTimeout(abortTimerId);
    self.fail();
    self.schedule();
  }

  xhr.onreadystatechange = function() {
    if (xhr.readyState != 4)
      return;

    onSuccess();
  }

  xhr.onerror = function(error) {
    onFailure();
  }

  try {
    xhr.open("GET", this.get_feed_url(), true);
    xhr.send(null);
  }
  catch(e) {
    onFailure();
  }
}

GmailAccountChecker.prototype.get_gmail_url = function() {
  return "https://mail.google.com/mail/u/" + this.index + "/";
}

GmailAccountChecker.prototype.get_feed_url = function() {
  return this.get_gmail_url() + "feed/atom/";
}

GmailAccountChecker.prototype.update = function(email, count) {
  this.email = email;
  this.unreadCount = count;
  this.lastUpdated_ = null;
  this.requestFailures_ = 0;
  this.onUpdate_();
}

GmailAccountChecker.prototype.fail = function() {
  this.email = null;
  this.unreadCount = null;
  this.lastUpdated_ = null;
  ++this.requestFailures_;
  this.onUpdate_();
}

function gmailNSResolver(prefix) {
  if(prefix == 'gmail') {
    return 'http://purl.org/atom/ns#';
  }
}

GmailAccountChecker.prototype.parse_feed = function(xml) {
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

GmailAccountChecker.prototype.schedule = function() {
  if (this.pendingRequestTimerId_) {
    window.clearTimeout(pendingRequestTimerId);
  }
  var pollIntervalMin = 1000 * 60;  // 1 minute
  var pollIntervalMax = 1000 * 60 * 60;  // 1 hour
  var randomness = Math.random() * 2;
  var exponent = Math.pow(2, this.requestFailures_);
  var delay = Math.min(randomness * pollIntervalMin * exponent,
                       pollIntervalMax);
  delay = Math.round(delay);

  var self = this;
  this.pendingRequestTimerId_ =
    window.setTimeout(function() { self.startCheck(); }, delay);
}

