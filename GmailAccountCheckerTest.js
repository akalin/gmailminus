describe('GmailAccountChecker', function () {
  it('initial state', function() {
    var req = new XMLHttpRequest();
    spyOn(GmailAccountChecker, 'makeXMLHttpRequest_').andReturn(req);
    spyOn(req, 'open');
    spyOn(req, 'send');

    spyOn(GmailAccountChecker, 'setTimeout_');
    spyOn(GmailAccountChecker, 'clearTimeout_');

    var mail_state = new GmailAccountChecker(2, function() {});
    expect(mail_state.index).toEqual(2);
    expect(mail_state.email).toEqual(null);
    expect(mail_state.unreadCount).toEqual(null);
    expect(mail_state.lastUpdateTime).toEqual(null);
    expect(mail_state.lastError).toEqual(null);
  });
});