// Color constants.
var COLOR_GREY_ = [190, 190, 190, 230];
var COLOR_RED_ = [208, 0, 24, 255];

// Set initial badge properties while the checker does the initial
// check.
setBadgeProperties_("gmail_unknown.png", "...", COLOR_GREY_, "Loading...");

// The checker is public so the options page can update its email
// regexp.
var checker = makeChecker_();

// When a user navigates in a tab, maybe start a check for its URL.
chrome.tabs.onUpdated.addListener(
  function(tabId, changeInfo) {
    if (changeInfo.url) {
      checker.startCheckForUrl(changeInfo.url);
    }
  });

// When a user clicks on the badge, select the preferred URL, or open
// it in a new tab.
chrome.browserAction.onClicked.addListener(
  function(tab) {
    chrome.tabs.getAllInWindow(
      undefined, function(tabs) {
	var urls = tabs.map(function (t) { return t.url; });
	var preferredUrl = checker.getPreferredUrl(urls);
	if (!selectTabWithUrl_(tabs, preferredUrl)) {
	  chrome.tabs.create({url: preferredUrl});
	}
      });
  });

// Utility functions

/**
 * @private
 *
 * @param iconPath The path of the icon to use for the badge.
 * @param badgeText The text to display on the badge.
 * @param badgeTextBackgroundColor The background color for the badge
 * text.
 * @param tooltip The tooltip to use for the badge.
 */
function setBadgeProperties_(iconPath, badgeText,
			     badgeTextBackgroundColor, tooltip) {
  chrome.browserAction.setIcon({path: iconPath});
  chrome.browserAction.setBadgeText({text: badgeText});
  chrome.browserAction.setBadgeBackgroundColor(
    {color: badgeTextBackgroundColor});
  chrome.browserAction.setTitle({title: tooltip});
}

/**
 * @private
 *
 * Creates a GmailChecker.
 *
 * @return A new initialized GmailChecker.
 */
function makeChecker_() {
  var emailRegexpText = localStorage.emailRegexp;
  var emailRegexp;
  try {
    emailRegexp = new RegExp(emailRegexpText, '');
  }
  catch(error) {
    console.warn(error);
    emailRegexp = /.*/;
  }
  var checker = new GmailChecker(
    emailRegexp, function() {
      var tooltip = makeTooltip_(checker.getAccountInfos());
      if (checker.unreadCount == null) {
	setBadgeProperties_("gmail_unknown.png", "?", COLOR_GREY_, tooltip);
      } else if (checker.unreadCount == 0) {
	setBadgeProperties_("gmail_no_unread.png", "", COLOR_GREY_, tooltip);
      } else {
	setBadgeProperties_("gmail_unread.png", unreadCount.toString(10),
			    COLOR_RED_, tooltip);
      }
    });
  return checker;
}

/**
 * @private
 *
 * Makes a tooltip from the given account infos.
 *
 * @param accountInfos The account infos from the GmailChecker.
 * @return A string with the created tooltip.
 */
function makeTooltip_(accountInfos) {
  return accountInfos.map(makeTooltipLine_).join('\n');
}

/**
 * @private
 *
 * Makes a tooltip line from the given account info.
 *
 * @param accountInfo A dictionary with account info.
 * @return A string with the created tooltip line.
 */
function makeTooltipLine_(accountInfo) {
  var email = accountInfo.email;
  var marker = accountInfo.isContributingEmail ? '*' : '';
  var unreadCount = accountInfo.unreadCount;
  if (!email) {
    email = '?';
    marker = '';
    unreadCount = '?';
  }
  return accountInfo.index + '. ' + email + marker + ': ' + unreadCount;
}

/**
 * @private
 *
 * Given a list of tabs, selects a tab matching the given URL.
 *
 * @param tabs The list of tabs.
 * @param url The URL to find.
 * @return True iff a tab was found and selected.
 */
function selectTabWithUrl_(tabs, url) {
  for (var i = 0; i < tabs.length; ++i) {
    var tab = tabs[i];
    if (tab.url == url) {
      chrome.tabs.update(tab.id, {selected: true});
      return true;
    }
  }
  return false;
}
