/**
 * @constructor
 *
 * @class GmailAccountChecker is a class that periodically reads the
 * unread count of a gmail account with multiple sign-in enabled.  It
 * has the public fields email, unreadCount, lastUpdateTime, and
 * lastError.  If there's an error, unreadCount and lastError are
 * non-null and all other fields are null.  Otherwise, lastError is
 * null and all other fields are non-null.
 *
 * @param index The multiple sign-in index of the gmail account to
 * check.
 * @param onUpdate The function to call after the unread count has
 * been updated.
 */
function GmailAccountChecker(index, onUpdate) {
  this.index_ = index;
  this.onUpdate_ = onUpdate;
  this.requestFailures_ = 0;
  this.pendingRequestTimerId_ = null;

  this.email = null;
  this.unreadCount = null;
  this.lastUpdateTime = null;
  this.lastError = null;

  this.startCheck();
}

/**
 * The following functions are overrideable for testing purposes.
 */

GmailAccountChecker.makeXMLHttpRequest_ = function() {
  return new XMLHttpRequest();
}

GmailAccountChecker.setTimeout_ = function(fn, timeout) {
  return window.setTimeout(fn, timeout);
}

GmailAccountChecker.clearTimeout_ = function(id) {
  window.clearTimeout(id);
}

/**
 * Checks the unread count immediately, preempting the currently
 * scheduled check.
 */
GmailAccountChecker.prototype.startCheck = function() {
  var req = GmailAccountChecker.makeXMLHttpRequest_();

  var requestTimeout = 5 * 1000;  // 5 seconds
  var abortTimerId = GmailAccountChecker.setTimeout_(
    function() {
      req.abort();
    }, requestTimeout);

  var self = this;

  var onSuccess = function() {
    GmailAccountChecker.clearTimeout_(abortTimerId);
    self.parseFeed_(req.responseXML);
    self.scheduleNextCheck_();
  };

  var onError = function(error) {
    GmailAccountChecker.clearTimeout_(abortTimerId);
    self.onError_(error);
    self.scheduleNextCheck_();
  };

  req.onload = function() {
    if (req.status == 200) {
      onSuccess();
    } else {
      onError(req.status + ': ' + req.statusText);
    }
  };
  req.onerror = onError;

  var feedUrl = this.getBaseUrl() + 'feed/atom/';

  console.info('starting request for ' + this.index_);

  try {
    req.open('GET', feedUrl, true);
    req.send(null);
  }
  catch(error) {
    onError(error);
  }
}

/**
 * @return Returns the base URL for this account.
 */
GmailAccountChecker.prototype.getBaseUrl = function() {
  return 'https://mail.google.com/mail/u/' + this.index_ + '/';
}

/**
 * @private
 *
 * Called when the feed for the account has been retrieved.  Parses
 * the feed, updates the public fields, and calls onUpdate_.
 */
GmailAccountChecker.prototype.parseFeed_ = function(xml) {
  var gmailNSResolver = function(prefix) {
    if(prefix == 'gmail') {
      return 'http://purl.org/atom/ns#';
    }
    return '';
  };

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

  console.info('updating ' + this.index_ + ' to ' + email + ': ' + fullCount);

  this.requestFailures_ = 0;
  this.email = email;
  this.unreadCount = fullCount;
  this.lastUpdateTime = new Date();
  this.lastError = null;
  this.onUpdate_();
}

/**
 * @private
 *
 * Schedules the next check with exponential back-off based on the
 * number of failures.
 */
GmailAccountChecker.prototype.scheduleNextCheck_ = function() {
  if (this.pendingRequestTimerId_) {
    GmailAccountChecker.clearTimeout_(this.pendingRequestTimerId_);
  }
  // 2 min
  var targetDelay = 2 * 60 * 1000;
  // Uniform[1, 3] min
  var perturbedDelay = targetDelay * (0.5 + Math.random());

  var backoff = Math.pow(2, this.requestFailures_);
  var delayWithBackoff = perturbedDelay * backoff;

  var minDelay = 1 * 60 * 1000;  // 1 min
  var maxDelay = 60 * 60 * 1000;  // 1 hour
  var boundedDelay = Math.max(minDelay, Math.min(maxDelay, delayWithBackoff));
  var delay = Math.round(boundedDelay);

  console.info('scheduling next check for ' + this.index_ + ' for ' +
	       delay/1000.0 + 's');

  var self = this;
  this.pendingRequestTimerId_ =
    GmailAccountChecker.setTimeout_(function() { self.startCheck(); }, delay);
}

/**
 * @private
 * 
 * Called when there is an error.  Nulls out all public fields and
 * calls onUpdate_.
 */
GmailAccountChecker.prototype.onError_ = function(error) {
  console.warn('got error for ' + this.index_ + ': ' + error);

  ++this.requestFailures_;
  this.email = null;
  this.unreadCount = null;
  this.lastUpdateTime = new Date();
  this.lastError = error;
  this.onUpdate_();
}
