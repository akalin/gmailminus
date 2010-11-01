describe('MailState', function () {
  it('initial state is empty', function() {
    var mail_state = new MailState(0);
    expect(mail_state.index).toEqual(0);
    expect(mail_state.email).toEqual(null);
    expect(mail_state.mail_count).toEqual(null);
    expect(mail_state.last_updated).toEqual(null);
    expect(mail_state.request_failures).toEqual(0);
  });

  it('cleared state is empty', function() {
    var mail_state = new MailState(1);
    expect(mail_state.index).toEqual(1);
    expect(mail_state.email).toEqual(null);
    expect(mail_state.mail_count).toEqual(null);
    expect(mail_state.last_updated).toEqual(null);
    expect(mail_state.request_failures).toEqual(0);
  });
});