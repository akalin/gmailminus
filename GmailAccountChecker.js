function GmailAccountChecker(index, onUpdate) {
  this.onUpdate_ = onUpdate;
  this.requestFailures_ = 0;
  this.pendingRequestTimerId_ = null;

  this.index = index;
  this.email = null;
  this.unreadCount = null;
  this.lastUpdateTime = null;
  this.lastError = null;

  this.startCheck();
}

GmailAccountChecker.prototype.setTimeout_ = function(fn, timeout) {
  return window.setTimeout(fn, timeout);
}
GmailAccountChecker.prototype.clearTimeout_ = function(id) {
  window.clearTimeout(id);
}

GmailAccountChecker.prototype.startCheck = function() {
  var req = new XMLHttpRequest();

  var requestTimeout = 5 * 1000;  // 5 seconds
  var abortTimerId = this.setTimeout_(function() {
    req.abort();
  }, requestTimeout);

  var self = this;

  var onSuccess = function() {
    self.clearTimeout_(abortTimerId);
    self.parseFeed_(req.responseXML);
    self.scheduleNextCheck_();
  }

  var onError = function(error) {
    self.clearTimeout_(abortTimerId);
    self.onError_(error);
    self.scheduleNextCheck_();
  }

  req.onload = function() { 
    if (req.status == 200) {
      onSuccess();
    } else {
      onError(req.status + ': ' + req.statusText);
    }
  }
  req.onerror = onError;

  var feedUrl = this.getBaseUrl() + "feed/atom/";

  try {
    req.open('GET', feedUrl, true);
    req.send(null);
  }
  catch(error) {
    onError(error);
  }
}

GmailAccountChecker.prototype.getBaseUrl = function() {
  return "https://mail.google.com/mail/u/" + this.index + "/";
}

GmailAccountChecker.prototype.parseFeed_ = function(xml) {
  var gmailNSResolver = function(prefix) {
    if(prefix == 'gmail') {
      return 'http://purl.org/atom/ns#';
    }
  }

  var titleSet = xml.evaluate('/gmail:feed/gmail:title', xml,
			      gmailNSResolver, XPathResult.ANY_TYPE, null);
  var titleNode = titleSet.iterateNext();
  if (!titleNode) {
    this.onError_('could not find title node');
    return;
  }
  title = titleNode.textContent;
  var emailMatch = /^Gmail - Inbox for (\S+)$/.exec(title);
  if (!emailMatch) {
    this.onError_('could not parse email from "' + title + '"');
    return;
  }
  email = emailMatch[1];

  var fullCountSet = xml.evaluate('/gmail:feed/gmail:fullcount', xml,
				  gmailNSResolver, XPathResult.ANY_TYPE, null);
  var fullCountNode = fullCountSet.iterateNext();
  if (!fullCountNode) {
    this.onError_('could not find fullcount node');
    return;
  }
  fullCount = parseInt(fullCountNode.textContent, 10);
  if (isNaN(fullCount)) {
    this.onError_('could not parse "' + fullCount + '"');
    return;
  }

  this.requestFailures_ = 0;
  this.email = email;
  this.unreadCount = fullCount;
  this.lastUpdateTime = new Date();
  this.lastError = null;
  this.onUpdate_();
}

GmailAccountChecker.prototype.scheduleNextCheck_ = function() {
  if (this.pendingRequestTimerId_) {
    this.clearTimeout_(this.pendingRequestTimerId_);
  }
  var pollIntervalMin = 60 * 1000;  // 1 minute
  var pollIntervalMax = 60 * 60 * 1000;  // 1 hour
  var randomness = Math.random() * 2;
  var exponent = Math.pow(2, this.requestFailures_);
  var delay = Math.min(randomness * pollIntervalMin * exponent,
                       pollIntervalMax);
  delay = Math.round(delay);

  var self = this;
  this.pendingRequestTimerId_ =
    this.setTimeout_(function() { self.startCheck(); }, delay);
}

GmailAccountChecker.prototype.onError_ = function(error) {
  ++this.requestFailures_;
  this.email = null;
  this.unreadCount = null;
  this.lastUpdateTime = new Date();
  this.lastError = error;
  this.onUpdate_();
}
