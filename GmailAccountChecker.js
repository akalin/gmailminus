GmailAccountChecker.makeXMLHttpRequest_ = function() {
  return new XMLHttpRequest();
}

GmailAccountChecker.setTimeout_ = function(fn, timeout) {
  return window.setTimeout(fn, timeout);
}

GmailAccountChecker.clearTimeout_ = function(id) {
  window.clearTimeout(id);
}

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

GmailAccountChecker.prototype.startCheck = function() {
  var req = GmailAccountChecker.makeXMLHttpRequest_();

  var requestTimeout = 5 * 1000;  // 5 seconds
  var abortTimerId = GmailAccountChecker.setTimeout_(function() {
    req.abort();
  }, requestTimeout);

  var self = this;

  var onSuccess = function() {
    GmailAccountChecker.clearTimeout_(abortTimerId);
    self.parseFeed_(req.responseXML);
    self.scheduleNextCheck_();
  }

  var onError = function(error) {
    GmailAccountChecker.clearTimeout_(abortTimerId);
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

  var feedUrl = this.getBaseUrl() + 'feed/atom/';

  console.info('starting request for ' + this.index);

  try {
    req.open('GET', feedUrl, true);
    req.send(null);
  }
  catch(error) {
    onError(error);
  }
}

GmailAccountChecker.prototype.getBaseUrl = function() {
  return 'https://mail.google.com/mail/u/' + this.index + '/';
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

  console.info('updating ' + this.index + ' to ' + email + ':' + fullCount);

  this.requestFailures_ = 0;
  this.email = email;
  this.unreadCount = fullCount;
  this.lastUpdateTime = new Date();
  this.lastError = null;
  this.onUpdate_();
}

GmailAccountChecker.prototype.scheduleNextCheck_ = function() {
  if (this.pendingRequestTimerId_) {
    GmailAccountChecker.clearTimeout_(this.pendingRequestTimerId_);
  }
  var pollIntervalMin = 60 * 1000;  // 1 minute
  var pollIntervalMax = 60 * 60 * 1000;  // 1 hour
  var randomness = Math.random() * 2;
  var exponent = Math.pow(2, this.requestFailures_);
  var delay = Math.min(randomness * pollIntervalMin * exponent,
                       pollIntervalMax);
  delay = Math.round(delay);

  console.info('scheduling next check for ' + this.index + ' for ' +
	       delay/1000.0 + 's');

  var self = this;
  this.pendingRequestTimerId_ =
    GmailAccountChecker.setTimeout_(function() { self.startCheck(); }, delay);
}

GmailAccountChecker.prototype.onError_ = function(error) {
  console.warn('got error for ' + this.index + ': ' + error);

  ++this.requestFailures_;
  this.email = null;
  this.unreadCount = null;
  this.lastUpdateTime = new Date();
  this.lastError = error;
  this.onUpdate_();
}
