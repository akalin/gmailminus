/**
 * @constructor
 *
 * @class GmailChecker is a class that periodically reads the unread
 * counts of all gmail accounts matching a regexp with multiple
 * sign-in enabled.  It has the public field unreadCount which is
 * non-null if at least one account has been read.
 *
 * @param emailRegexp The regexp which an account has to match to be
 * counted.
 * @param onUpdate The function to call after the unread count has
 * been updated.
 */
function GmailChecker(emailRegexp, onUpdate) {
  this.emailRegexp_ = emailRegexp;
  this.onUpdate_ = onUpdate;
  var self = this;
  var onAccountUpdate = function() {
    self.onAccountUpdate_();
  };
  this.accountCheckers_ = [];
  for (var i = 0; i < GmailChecker.MAX_ACCOUNTS_; ++i) {
    this.accountCheckers_.push(new GmailAccountChecker(i, onAccountUpdate));
  }

  this.unreadCount = null;
}

/**
 * @private
 *
 * The maximum number of accounts possible (not documented anywhere,
 * but multiple sign-in prevents you from logging into more accounts).
 */
// Update the regexp in getGmailUrlIndex_ if you change this.
GmailChecker.MAX_ACCOUNTS_ = 3;

/**
 * @private
 *
 * Given a URL, parses the account index from it.
 *
 * @returns the account index, or null if it couldn't be parsed.
 */
GmailChecker.getGmailUrlIndex_ = function (url) {
  // Update the end part of this regexp if you change
  // getGmailUrlIndex_.
  var match = /^https:\/\/mail.google.com\/mail\/u\/([012])(.*)/.exec(url);
  if (!match)
    return null;
  var index = match[1];
  var suffix = match[2];
  // Suffix must either be empty or start with /.
  return ((suffix.length == 0) || (suffix[0] == '/')) ? index : null;
}

/**
 * Updates the regexp used for matching.
 *
 * @param emailRegexp The new regexp which an account has to match to
 * be counted.
 */
GmailChecker.prototype.updateEmailRegexp = function(emailRegexp) {
  this.emailRegexp_ = emailRegexp;
  this.onAccountUpdate_();
}

/**
 * If the given URL is the URL of a gmail mailbox, starts a check for
 * that mailbox.
 *
 * @param url The URL to start the check for.
 */
GmailChecker.prototype.startCheckForUrl = function(url) {
  var index = GmailChecker.getGmailUrlIndex_(url);
  if (index) {
    // TODO(akalin): Add hysteresis.
    console.info('starting check for ' + url + ' (' + index + ')');
    this.accountCheckers_[index].startCheck();
  }
}

/**
 * Returns the URL for a page that displays the first mailbox with
 * unread messages.
 */
GmailChecker.prototype.getPreferredUrl = function(urls) {
  var preferredIndex = this.getPreferredIndex_();

  {
    for (var i = 0; i < urls.length; ++i) {
      var url = urls[i];
      var index = GmailChecker.getGmailUrlIndex_(url);
      if (index == preferredIndex) {
	return url;
      }
    }
  }
  return this.accountCheckers_[preferredIndex].getBaseUrl();
}

GmailChecker.prototype.getAccountInfos = function() {
  var accountInfos = [];
  for (var i = 0; i < GmailChecker.MAX_ACCOUNTS_; ++i) {
    var accountChecker = this.accountCheckers_[i];
    var accountInfo = {
      index: i,
      email: accountChecker.email,
      unreadCount: accountChecker.unreadCount,
      isContributingEmail: this.isContributingEmail_(accountChecker.email)
    };
    accountInfos.push(accountInfo);
  }
  return accountInfos;
}

/**
 * @private
 *
 * @param email The email to test.
 *
 * @return true iff the email address contributes to the unread count.
 */
GmailChecker.prototype.isContributingEmail_ = function(email) {
  return this.emailRegexp_.test(email);
}

/**
 * @private
 *
 * @return The index of the preferred mailbox.
 */
GmailChecker.prototype.getPreferredIndex_ = function() {
  // Find the first contributing account with unread messages.
  {
    for (var i = 0; i < GmailChecker.MAX_ACCOUNTS_; ++i) {
      var accountChecker = this.accountCheckers_[i];
      if (this.isContributingEmail_(accountChecker.email) &&
	  (accountChecker.unreadCount > 0)) {
	return i;
      }
    }
  }

  // Otherwise, find the first contributing account.
  {
    for (var i = 0; i < GmailChecker.MAX_ACCOUNTS_; ++i) {
      var accountChecker = this.accountCheckers_[i];
      if (this.isContributingEmail_(accountChecker.email)) {
	return i;
      }
    }
  }

  return 0;
}

/**
 * @private
 *
 * Called when an account is updated.  Updates unreadCount.
 */
GmailChecker.prototype.onAccountUpdate_ = function() {
  var newUnreadCount = null;
  for (var i = 0; i < GmailChecker.MAX_ACCOUNTS_; ++i) {
    var accountChecker = this.accountCheckers_[i];
    if (this.isContributingEmail_(accountChecker.email)) {
      newUnreadCount = newUnreadCount || 0;
      newUnreadCount += accountChecker.unreadCount;
    }
  }
  console.info("unreadCount: " + this.unreadCount + " -> " + newUnreadCount);
  this.unreadCount = newUnreadCount;
  this.onUpdate_();
}
