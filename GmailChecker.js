var MAX_ACCOUNTS = 3;

function GmailChecker(emailRegexp, onUpdate) {
  this.emailRegexp_ = emailRegexp;
  this.onUpdate_ = onUpdate;
  var self = this;
  var onAccountUpdate = function() {
    self.onAccountUpdate_();
  }
  this.accountCheckers_ = []
  for (var i = 0; i < MAX_ACCOUNTS; ++i) {
    this.accountCheckers_[i] = new GmailAccountChecker(i, onAccountUpdate);
  }

  this.unreadCount = null;
}

function getGmailUrlIndex(url) {
  var match = /^https:\/\/mail.google.com\/mail\/u\/([012])/.exec(url);
  return match ? match[1] : -1;
}

GmailChecker.prototype.onTabUpdated = function(url) {
  var index = getGmailUrlIndex(url);
  if (index != -1) {
    this.accountCheckers_[index].startCheck();
  }
}

GmailChecker.prototype.findInboxTab = function(tabs) {
  for (var i = 0; i < tabs.length; ++i) {
    if (tabs[i].url) {
      var index = getGmailUrlIndex(tabs[i].url);
      if (index != -1) {
        return i;
      }
    }
  }
  return null;
}

GmailChecker.prototype.getDefaultUrl = function() {
  return accountsCheckers_[0].getBaseUrl();
}

GmailChecker.prototype.onAccountUpdate_ = function() {
  var newUnreadCount = null;
  for (var i = 0; i < MAX_ACCOUNTS; ++i) {
    if (this.emailRegexp_.test(this.accountCheckers_[i].email)) {
      newUnreadCount = newUnreadCount || 0;
      newUnreadCount += this.accountCheckers_[i].unreadCount;
    }
  }
  console.info("unreadCount: " + this.unreadCount + " -> " + newUnreadCount);
  if (this.unreadCount != newUnreadCount) {
    this.unreadCount = newUnreadCount;
    this.onUpdate_();
  }
}
