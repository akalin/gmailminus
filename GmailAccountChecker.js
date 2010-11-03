GmailAccountChecker.prototype.get_gmail_url = function() {
  return "https://mail.google.com/mail/u/" + this.index + "/";
}

GmailAccountChecker.prototype.get_feed_url = function() {
  return this.get_gmail_url() + "feed/atom/";
}

GmailAccountChecker.prototype.update = function(email, count) {
  this.email = email;
  this.unreadCount = count;
  this.lastUpdated = null;
  this.requestFailures = 0;
  this.onUpdate();
}

GmailAccountChecker.prototype.fail = function() {
  this.email = null;
  this.unreadCount = null;
  this.lastUpdated = null;
  ++this.requestFailures;
  this.onUpdate();
}

function gmailNSResolver(prefix) {
  if(prefix == 'gmail') {
    return 'http://purl.org/atom/ns#';
  }
}

GmailAccountChecker.prototype.parse_feed = function(xml) {
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

GmailAccountChecker.prototype.schedule = function() {
  var pollIntervalMin = 1000 * 60;  // 1 minute
  var pollIntervalMax = 1000 * 60 * 60;  // 1 hour
  var randomness = Math.random() * 2;
  var exponent = Math.pow(2, this.requestFailures);
  var delay = Math.min(randomness * pollIntervalMin * exponent,
                       pollIntervalMax);
  delay = Math.round(delay);

  var self = this;
  this.pendingRequestTimerId =
    window.setTimeout(function() { self.get_inbox_count(); }, delay);
}

GmailAccountChecker.prototype.get_inbox_count = function() {
  var xhr = new XMLHttpRequest();
  var requestTimeout = 1000 * 2;  // 5 seconds
  var abortTimerId = window.setTimeout(function() {
    xhr.abort();  // synchronously calls onreadystatechange
  }, requestTimeout);

  var self = this;
  function runHandler(xml) {
    window.clearTimeout(abortTimerId);
    self.parse_feed(xml);
    if (this.pendingRequestTimerId) {
      window.clearTimeout(pendingRequestTimerId);
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

function GmailAccountChecker(index, onUpdate) {
  this.index = index;
  this.onUpdate = onUpdate;
  this.email = null;
  this.unreadCount = null;
  this.lastUpdated = null;
  this.requestFailures = 0;
  this.pendingRequestTimerId = null;
  this.get_inbox_count();
}
