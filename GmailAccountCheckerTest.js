describe('GmailAccountChecker', function () {
  it('basic flow', function() {
    spyOn(GmailAccountChecker, 'setTimeout_');

    var req = new XMLHttpRequest();
    spyOn(GmailAccountChecker, 'makeXMLHttpRequest_').andReturn(req);
    spyOn(req, 'open');
    spyOn(req, 'send');

    spyOn(GmailAccountChecker, 'clearTimeout_');

    var mail_state = new GmailAccountChecker(2, function() {});
    expect(mail_state.index).toEqual(2);
    expect(mail_state.email).toEqual(null);
    expect(mail_state.unreadCount).toEqual(null);
    expect(mail_state.lastUpdateTime).toEqual(null);
    expect(mail_state.lastError).toEqual(null);

    expect(GmailAccountChecker.setTimeout_).toHaveBeenCalled();
    expect(GmailAccountChecker.makeXMLHttpRequest_).toHaveBeenCalled();
    expect(req.open).toHaveBeenCalled();
    expect(req.send).toHaveBeenCalled();
  });
});