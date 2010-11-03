function FakeXMLHttpRequest() {}

FakeXMLHttpRequest.prototype.open = function() {}
FakeXMLHttpRequest.prototype.send = function() {}

function stringToXml(str) {
  return (new DOMParser()).parseFromString(str, 'text/xml');
}

describe('GmailAccountChecker', function () {
  var fakeReq;
  var callbackSpy;

  beforeEach(function () {
    spyOn(GmailAccountChecker, 'setTimeout_');

    fakeReq = new FakeXMLHttpRequest();
    spyOn(GmailAccountChecker, 'makeXMLHttpRequest_').andReturn(fakeReq);
    spyOn(fakeReq, 'open');
    spyOn(fakeReq, 'send');

    callbackSpy = jasmine.createSpy();
    spyOn(GmailAccountChecker, 'clearTimeout_');
  });

  it('basic flow', function() {
    var accountChecker = new GmailAccountChecker(2, callbackSpy);
    expect(accountChecker.index).toEqual(2);
    expect(accountChecker.email).toEqual(null);
    expect(accountChecker.unreadCount).toEqual(null);
    expect(accountChecker.lastUpdateTime).toEqual(null);
    expect(accountChecker.lastError).toEqual(null);

    expect(GmailAccountChecker.setTimeout_).toHaveBeenCalled();
    expect(GmailAccountChecker.makeXMLHttpRequest_).toHaveBeenCalled();
    expect(fakeReq.open).toHaveBeenCalled();
    expect(fakeReq.send).toHaveBeenCalled();
    expect(callbackSpy).not.toHaveBeenCalled();
    expect(GmailAccountChecker.clearTimeout_).not.toHaveBeenCalled();

    fakeReq.status = 200;
    var xmlText =
      '<feed xmlns="http://purl.org/atom/ns#" version="0.3">' +
      '<title>Gmail - Inbox for foo@bar.com</title>' +
      '<tagline>New messages in your Gmail Inbox</tagline>' +
      '<fullcount>300</fullcount>' +
      '<link rel="alternate" href="http://mail.google.com/mail/u/0" ' +
      'type="text/html"/>' +
      '<modified>2010-11-02T03:35:17Z</modified>' +
      '</feed>';
    var xml = stringToXml(xmlText);
    fakeReq.responseXML = xml;
    fakeReq.onload();

    expect(accountChecker.index).toEqual(2);
    expect(accountChecker.email).toEqual('foo@bar.com');
    expect(accountChecker.unreadCount).toEqual(300);
    expect(accountChecker.lastUpdateTime).toNotEqual(null);
    expect(accountChecker.lastError).toEqual(null);

    expect(callbackSpy).toHaveBeenCalled();
    expect(GmailAccountChecker.clearTimeout_).toHaveBeenCalled();
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(2);
  });

  it('parse error', function() {
    var accountChecker = new GmailAccountChecker(1, callbackSpy);
    expect(accountChecker.index).toEqual(1);
    expect(accountChecker.email).toEqual(null);
    expect(accountChecker.unreadCount).toEqual(null);
    expect(accountChecker.lastUpdateTime).toEqual(null);
    expect(accountChecker.lastError).toEqual(null);

    expect(GmailAccountChecker.setTimeout_).toHaveBeenCalled();
    expect(GmailAccountChecker.makeXMLHttpRequest_).toHaveBeenCalled();
    expect(fakeReq.open).toHaveBeenCalled();
    expect(fakeReq.send).toHaveBeenCalled();
    expect(callbackSpy).not.toHaveBeenCalled();
    expect(GmailAccountChecker.clearTimeout_).not.toHaveBeenCalled();

    fakeReq.status = 200;
    var xmlText =
      '<feed xmlns="http://purl.org/atom/ns#" version="0.3">' +
      '</feed>';
    var xml = stringToXml(xmlText);
    fakeReq.responseXML = xml;
    fakeReq.onload();
    expect(accountChecker.index).toEqual(1);
    expect(accountChecker.email).toEqual(null);
    expect(accountChecker.unreadCount).toEqual(null);
    expect(accountChecker.lastUpdateTime).toNotEqual(null);
    expect(accountChecker.lastError).toNotEqual(null);

    expect(callbackSpy).toHaveBeenCalled();
    expect(GmailAccountChecker.clearTimeout_).toHaveBeenCalled();
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(2);
  });

  it('request error', function() {
    var accountChecker = new GmailAccountChecker(1, callbackSpy);
    expect(accountChecker.index).toEqual(1);
    expect(accountChecker.email).toEqual(null);
    expect(accountChecker.unreadCount).toEqual(null);
    expect(accountChecker.lastUpdateTime).toEqual(null);
    expect(accountChecker.lastError).toEqual(null);

    expect(GmailAccountChecker.setTimeout_).toHaveBeenCalled();
    expect(GmailAccountChecker.makeXMLHttpRequest_).toHaveBeenCalled();
    expect(fakeReq.open).toHaveBeenCalled();
    expect(fakeReq.send).toHaveBeenCalled();
    expect(callbackSpy).not.toHaveBeenCalled();
    expect(GmailAccountChecker.clearTimeout_).not.toHaveBeenCalled();

    fakeReq.status = 404;
    fakeReq.onload();
    expect(accountChecker.index).toEqual(1);
    expect(accountChecker.email).toEqual(null);
    expect(accountChecker.unreadCount).toEqual(null);
    expect(accountChecker.lastUpdateTime).toNotEqual(null);
    expect(accountChecker.lastError).toNotEqual(null);

    expect(callbackSpy).toHaveBeenCalled();
    expect(GmailAccountChecker.clearTimeout_).toHaveBeenCalled();
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(2);
  });
});