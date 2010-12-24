/**
 * @constructor
 *
 * @class Helper class that stubs out the XMLHttpRequest methods that
 * do actual work.
 */
function FakeXMLHttpRequest() {}

FakeXMLHttpRequest.prototype.open = function() {};
FakeXMLHttpRequest.prototype.send = function() {};

/**
 * Utility function that converts a string to an XML object.
 *
 * @param str The string containing a valid XML document.
 *
 * @return The XML object parsed from str.
 */
function stringToXml(str) {
  return (new DOMParser()).parseFromString(str, 'text/xml');
}

/**
 * Utility function that makes a feed XML response for an account.
 *
 * @param index The index of the account.
 * @param email The email of the account.
 * @param unreadCount The unread count of the account.
 */
function makeFeedXml(index, email, unreadCount) {
  var xmlText =
    '<feed xmlns="http://purl.org/atom/ns#" version="0.3">' +
    '<title>Gmail - Inbox for ' + email + '</title>' +
    '<tagline>New messages in your Gmail Inbox</tagline>' +
    '<fullcount>' + unreadCount + '</fullcount>' +
    '<link rel="alternate" href="http://mail.google.com/mail/u/' +
    index + '" type="text/html"/>' +
    '<modified>2010-11-02T03:35:17Z</modified>' +
    '</feed>';
  return stringToXml(xmlText);
}

describe('GmailChecker', function () {
  var fakeReqs;
  var callbackSpy;

  beforeEach(function () {
    spyOn(GmailAccountChecker, 'setTimeout_');
    fakeReqs = [];

    var makeFakeXMLHttpRequest = function() {
      var fakeReq = new FakeXMLHttpRequest();
      spyOn(fakeReq, 'open');
      spyOn(fakeReq, 'send');
      fakeReqs.push(fakeReq);
      return fakeReq;
    };

    spyOn(GmailAccountChecker, 'makeXMLHttpRequest_')
      .andCallFake(makeFakeXMLHttpRequest);

    spyOn(GmailAccountChecker, 'clearTimeout_');

    callbackSpy = jasmine.createSpy();
  });

  /**
   * Tests the flow of various account checks.
   */
  it('basic flow', function() {
    var checker = new GmailChecker(/foo/, callbackSpy);
    expect(checker.unreadCount).toEqual(null);

    var numAccounts = fakeReqs.length;
    expect(numAccounts).toEqual(3);

    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(numAccounts);
    expect(GmailAccountChecker.makeXMLHttpRequest_.callCount)
      .toEqual(numAccounts);
    for (var i = 0; i < numAccounts; ++i) {
      expect(fakeReqs[i].open.callCount).toEqual(1);
      expect(fakeReqs[i].send.callCount).toEqual(1);
    }

    expect(callbackSpy).not.toHaveBeenCalled();
    expect(GmailAccountChecker.clearTimeout_).not.toHaveBeenCalled();
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(numAccounts);

    // Have first request come back.
    fakeReqs[0].status = 200;
    fakeReqs[0].responseXML = makeFeedXml(0, 'foo@bar.com', 300);
    fakeReqs[0].onload();

    expect(checker.unreadCount).toEqual(300);

    expect(callbackSpy.callCount).toEqual(1);
    expect(GmailAccountChecker.clearTimeout_.callCount).toEqual(1);
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(numAccounts + 1);

    // Have second request come back.
    fakeReqs[1].status = 200;
    fakeReqs[1].responseXML = makeFeedXml(1, 'bar@foo.com', 400);
    fakeReqs[1].onload();

    expect(checker.unreadCount).toEqual(700);

    expect(callbackSpy.callCount).toEqual(2);
    expect(GmailAccountChecker.clearTimeout_.callCount).toEqual(2);
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(numAccounts + 2);

    // Have third request come back (doesn't match).
    fakeReqs[2].status = 200;
    fakeReqs[2].responseXML = makeFeedXml(1, 'bar@baz.com', 500);
    fakeReqs[2].onload();

    expect(checker.unreadCount).toEqual(700);

    expect(callbackSpy.callCount).toEqual(3);
    expect(GmailAccountChecker.clearTimeout_.callCount).toEqual(3);
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(numAccounts + 3);

    // Have first request come back again (failure).
    fakeReqs[0].status = 200;
    var xmlText =
      '<feed xmlns="http://purl.org/atom/ns#" version="0.3">' +
      '</feed>';
    fakeReqs[0].responseXML = stringToXml(xmlText);
    fakeReqs[0].onload();

    expect(checker.unreadCount).toEqual(400);

    expect(callbackSpy.callCount).toEqual(4);
    expect(GmailAccountChecker.clearTimeout_.callCount).toEqual(4);
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(numAccounts + 4);

    // Have second request come back again (failure).
    fakeReqs[1].status = 404;
    fakeReqs[1].onload();

    expect(checker.unreadCount).toEqual(null);

    expect(callbackSpy.callCount).toEqual(5);
    expect(GmailAccountChecker.clearTimeout_.callCount).toEqual(5);
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(numAccounts + 5);
  });

  /**
   * Tests updateEmailRegexp.
   */
  it('updateEmailRegexp', function() {
    var checker = new GmailChecker(/foo/, callbackSpy);

    // Have requests come back.
    fakeReqs[0].status = 200;
    fakeReqs[0].responseXML = makeFeedXml(0, 'foo@bar.com', 300);
    fakeReqs[1].status = 200;
    fakeReqs[1].responseXML = makeFeedXml(1, 'bar@baz.com', 400);
    fakeReqs[2].status = 200;
    fakeReqs[2].responseXML = makeFeedXml(1, 'baz@foo.com', 500);

    fakeReqs[0].onload();
    fakeReqs[1].onload();
    fakeReqs[2].onload();

    expect(checker.unreadCount).toEqual(800);

    checker.updateEmailRegexp(/bar/);
    expect(checker.unreadCount).toEqual(700);

    checker.updateEmailRegexp(/baz/);
    expect(checker.unreadCount).toEqual(900);
  });

  /**
   * Tests startCheckForUrl.
   */
  it('startCheckForUrl', function() {
    var checker = new GmailChecker(/foo/, callbackSpy);

    var numAccounts = fakeReqs.length;
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(numAccounts);

    checker.startCheckForUrl('http://mail.google.com/mail/u/0');
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(numAccounts);

    checker.startCheckForUrl('https://www.google.com/mail/u/0');
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(numAccounts);

    checker.startCheckForUrl('https://mail.yahoo.com/mail/u/0');
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(numAccounts);

    checker.startCheckForUrl('https://mail.yahoo.com/mail/0');
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(numAccounts);

    checker.startCheckForUrl('https://mail.google.com/mail/u/01');
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(numAccounts);

    checker.startCheckForUrl('https://mail.google.com/mail/u/12');
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(numAccounts);

    checker.startCheckForUrl('https://mail.google.com/mail/u/23');
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(numAccounts);

    checker.startCheckForUrl('https://mail.google.com/mail/u/0');
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(numAccounts + 1);

    checker.startCheckForUrl('https://mail.google.com/mail/u/1');
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(numAccounts + 2);

    checker.startCheckForUrl('https://mail.google.com/mail/u/2');
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(numAccounts + 3);

    checker.startCheckForUrl('https://mail.google.com/mail/u/0/');
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(numAccounts + 4);

    checker.startCheckForUrl('https://mail.google.com/mail/u/1/');
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(numAccounts + 5);

    checker.startCheckForUrl('https://mail.google.com/mail/u/2/');
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(numAccounts + 6);

    checker.startCheckForUrl('https://mail.google.com/mail/u/0/foo/bar');
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(numAccounts + 7);

    checker.startCheckForUrl('https://mail.google.com/mail/u/1/baz/');
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(numAccounts + 8);

    checker.startCheckForUrl('https://mail.google.com/mail/u/2/blah');
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(numAccounts + 9);
  });

  /**
   * Tests getPreferredUrl.
   */
  it('getPreferredUrl', function() {
    var checker = new GmailChecker(/foo/, callbackSpy);

    // Have requests come back.
    fakeReqs[0].status = 200;
    fakeReqs[0].responseXML = makeFeedXml(0, 'foo@bar.com', 300);
    fakeReqs[1].status = 200;
    fakeReqs[1].responseXML = makeFeedXml(1, 'bar@baz.com', 400);
    fakeReqs[2].status = 200;
    fakeReqs[2].responseXML = makeFeedXml(1, 'baz@foo.com', 500);

    fakeReqs[0].onload();
    fakeReqs[1].onload();
    fakeReqs[2].onload();

    var urls = [
      'http://mail.google.com/mail/u/0',
      'https://www.google.com/mail/u/0',
      'https://mail.yahoo.com/mail/u/0',
      'https://mail.yahoo.com/mail/0',
      'https://mail.google.com/mail/u/01',
      'https://mail.google.com/mail/u/12',
      'https://mail.google.com/mail/u/23',
      'https://mail.google.com/mail/u/3/',
      'https://mail.google.com/mail/u/2/',
      'https://mail.google.com/mail/u/1/',  // 9
      'https://mail.google.com/mail/u/0',   // 10
      'https://mail.google.com/mail/u/0/',  // 11
      'https://mail.google.com/mail/u/1',
      'https://mail.google.com/mail/u/2',
      'https://mail.google.com/mail/u/0/foo/bar',
      'https://mail.google.com/mail/u/1/baz/',
      'https://mail.google.com/mail/u/2/blah'
    ];

    expect(checker.getPreferredUrl(urls)).toEqual(urls[10]);

    checker.updateEmailRegexp(/bar/);
    expect(checker.getPreferredUrl(urls)).toEqual(urls[10]);
    expect(checker.getPreferredUrl([])).toEqual(urls[11]);

    checker.updateEmailRegexp(/baz/);
    expect(checker.getPreferredUrl(urls)).toEqual(urls[9]);
    expect(checker.getPreferredUrl([])).toEqual(urls[9]);

    checker.updateEmailRegexp(/quux/);
    expect(checker.getPreferredUrl(urls)).toEqual(urls[10]);
    expect(checker.getPreferredUrl([])).toEqual(urls[11]);

    // Have requests come back again with no unread emails.
    fakeReqs[0].responseXML = makeFeedXml(0, 'foo@bar.com', 0);
    fakeReqs[1].responseXML = makeFeedXml(1, 'bar@baz.com', 0);
    fakeReqs[2].responseXML = makeFeedXml(1, 'baz@foo.com', 0);

    fakeReqs[0].onload();
    fakeReqs[1].onload();
    fakeReqs[2].onload();

    checker.updateEmailRegexp(/foo/);
    expect(checker.getPreferredUrl(urls)).toEqual(urls[10]);
    expect(checker.getPreferredUrl([])).toEqual(urls[11]);

    checker.updateEmailRegexp(/bar/);
    expect(checker.getPreferredUrl(urls)).toEqual(urls[10]);
    expect(checker.getPreferredUrl([])).toEqual(urls[11]);

    checker.updateEmailRegexp(/baz/);
    expect(checker.getPreferredUrl(urls)).toEqual(urls[9]);
    expect(checker.getPreferredUrl([])).toEqual(urls[9]);

    checker.updateEmailRegexp(/quux/);
    expect(checker.getPreferredUrl(urls)).toEqual(urls[10]);
    expect(checker.getPreferredUrl([])).toEqual(urls[11]);
  });

  /**
   * Tests getPreferredUrl.
   */
  it('getAccountInfos', function() {
    var checker = new GmailChecker(/foo/, callbackSpy);

    // Have requests come back.
    fakeReqs[0].status = 200;
    fakeReqs[0].responseXML = makeFeedXml(0, 'foo@bar.com', 300);
    fakeReqs[1].status = 200;
    fakeReqs[1].responseXML = makeFeedXml(1, 'bar@baz.com', 400);
    fakeReqs[2].status = 200;
    fakeReqs[2].responseXML = makeFeedXml(1, 'baz@foo.com', 500);

    fakeReqs[0].onload();
    fakeReqs[1].onload();
    fakeReqs[2].onload();

    var expectedAccountInfos = [
      {
	index: 0,
	email : 'foo@bar.com',
	unreadCount : 300,
	isContributingEmail : true
      },
      {
	index: 1,
	email : 'bar@baz.com',
	unreadCount : 400,
	isContributingEmail : false
      },
      {
	index: 2,
	email : 'baz@foo.com',
	unreadCount : 500,
	isContributingEmail : true
      }
    ];

    expect(checker.getAccountInfos()).toEqual(expectedAccountInfos);
  });
});
