function FakeXMLHttpRequest() {}

FakeXMLHttpRequest.prototype.open = function() {}
FakeXMLHttpRequest.prototype.send = function() {}

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
    var checker = new GmailAccountChecker(2, callbackSpy);
    expect(checker.index).toEqual(2);
    expect(checker.email).toEqual(null);
    expect(checker.unreadCount).toEqual(null);
    expect(checker.lastUpdateTime).toEqual(null);
    expect(checker.lastError).toEqual(null);

    expect(GmailAccountChecker.setTimeout_).toHaveBeenCalled();
    expect(GmailAccountChecker.makeXMLHttpRequest_).toHaveBeenCalled();
    expect(fakeReq.open).toHaveBeenCalled();
    expect(fakeReq.send).toHaveBeenCalled();
    expect(callbackSpy).not.toHaveBeenCalled();
    expect(GmailAccountChecker.clearTimeout_).not.toHaveBeenCalled();

    fakeReq.status = 200;
    var xml_text =
      '<feed xmlns="http://purl.org/atom/ns#" version="0.3">' +
      '<title>Gmail - Inbox for foo@bar.com</title>' +
      '<tagline>New messages in your Gmail Inbox</tagline>' +
      '<fullcount>300</fullcount>' +
      '<link rel="alternate" href="http://mail.google.com/mail/u/0" ' +
      'type="text/html"/>' +
      '<modified>2010-11-02T03:35:17Z</modified>' +
      '</feed>';
    var xml = (new DOMParser()).parseFromString(xml_text, "text/xml");
    fakeReq.responseXML = xml;
    fakeReq.onload();

    expect(checker.index).toEqual(2);
    expect(checker.email).toEqual('foo@bar.com');
    expect(checker.unreadCount).toEqual(300);
    expect(checker.lastUpdateTime).toNotEqual(null);
    expect(checker.lastError).toEqual(null);

    expect(callbackSpy).toHaveBeenCalled();
    expect(GmailAccountChecker.clearTimeout_).toHaveBeenCalled();
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(2);
  });

  it('parse error', function() {
    var checker = new GmailAccountChecker(1, callbackSpy);
    expect(checker.index).toEqual(1);
    expect(checker.email).toEqual(null);
    expect(checker.unreadCount).toEqual(null);
    expect(checker.lastUpdateTime).toEqual(null);
    expect(checker.lastError).toEqual(null);

    expect(GmailAccountChecker.setTimeout_).toHaveBeenCalled();
    expect(GmailAccountChecker.makeXMLHttpRequest_).toHaveBeenCalled();
    expect(fakeReq.open).toHaveBeenCalled();
    expect(fakeReq.send).toHaveBeenCalled();
    expect(callbackSpy).not.toHaveBeenCalled();
    expect(GmailAccountChecker.clearTimeout_).not.toHaveBeenCalled();

    fakeReq.status = 200;
    var xml_text =
      '<feed xmlns="http://purl.org/atom/ns#" version="0.3">' +
      '</feed>';
    var xml = (new DOMParser()).parseFromString(xml_text, "text/xml");
    fakeReq.responseXML = xml;
    fakeReq.onload();
    expect(checker.index).toEqual(1);
    expect(checker.email).toEqual(null);
    expect(checker.unreadCount).toEqual(null);
    expect(checker.lastUpdateTime).toNotEqual(null);
    expect(checker.lastError).toNotEqual(null);

    expect(callbackSpy).toHaveBeenCalled();
    expect(GmailAccountChecker.clearTimeout_).toHaveBeenCalled();
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(2);
  });
});