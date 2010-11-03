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
    self.parseFeed_(xhr.responseXML);
    self.scheduleNextCheck_();
  }

  var onError = function(error) {
    window.clearTimeout(abortTimerId);
    self.onError_(error);
    self.scheduleNextCheck_();
  }

  xhr.onload = function() { 
    if (xhr.status == 200) {
      onSuccess();
    } else {
      onError(xhr.status + ': ' + xhr.statusText);
    }
  }
  xhr.onerror = onError;

  var feedUrl = this.getBaseUrl() + "feed/atom/";

  try {
    xhr.open('GET', feedUrl, true);
    xhr.send(null);
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

  this.email = email;
  this.unreadCount = fullCount;
  // TODO(akalin): fill in lastUpdated_.
  this.lastUpdated_ = null;
  this.requestFailures_ = 0;
  this.onUpdate_();
}

GmailAccountChecker.prototype.scheduleNextCheck_ = function() {
  if (this.pendingRequestTimerId_) {
    window.clearTimeout(this.pendingRequestTimerId_);
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
    window.setTimeout(function() { self.startCheck(); }, delay);
}

GmailAccountChecker.prototype.onError_ = function(error) {
  console.error(error);
  this.email = null;
  this.unreadCount = null;
  // TODO(akalin): fill in lastUpdated_.
  this.lastUpdated_ = null;
  ++this.requestFailures_;
  this.onUpdate_();
}
