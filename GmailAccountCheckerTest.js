describe('GmailAccountChecker', function () {
  it('basic flow', function() {
    spyOn(GmailAccountChecker, 'setTimeout_');

    var req = new XMLHttpRequest();
    spyOn(GmailAccountChecker, 'makeXMLHttpRequest_').andReturn(req);
    spyOn(req, 'open');
    spyOn(req, 'send');

    var spy = jasmine.createSpy();
    spyOn(GmailAccountChecker, 'clearTimeout_');

    var checker = new GmailAccountChecker(2, spy);
    expect(checker.index).toEqual(2);
    expect(checker.email).toEqual(null);
    expect(checker.unreadCount).toEqual(null);
    expect(checker.lastUpdateTime).toEqual(null);
    expect(checker.lastError).toEqual(null);

    expect(GmailAccountChecker.setTimeout_).toHaveBeenCalled();
    expect(GmailAccountChecker.makeXMLHttpRequest_).toHaveBeenCalled();
    expect(req.open).toHaveBeenCalled();
    expect(req.send).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
    expect(GmailAccountChecker.clearTimeout_).not.toHaveBeenCalled();

    req.status = 200;
    req.onload();
    expect(checker.index).toEqual(2);
    expect(checker.email).toEqual('foo@bar.com');
    expect(checker.unreadCount).toEqual(300);
    expect(checker.lastUpdateTime).toNotEqual(null);
    expect(checker.lastError).toEqual(null);

    expect(spy).toHaveBeenCalled();
    expect(GmailAccountChecker.clearTimeout_).toHaveBeenCalled();
    expect(GmailAccountChecker.setTimeout_.callCount).toEqual(2);
  });
});