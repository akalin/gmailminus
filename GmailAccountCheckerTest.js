describe('GmailAccountChecker', function () {
  it('initial state', function() {
    spyOn(GmailAccountChecker, 'makeXMLHttpRequest_');
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