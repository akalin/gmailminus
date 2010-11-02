describe('MailState', function () {
  it('initial state', function() {
    var mail_state = new MailState(0);
    expect(mail_state.index).toEqual(0);
    expect(mail_state.email).toEqual(null);
    expect(mail_state.mail_count).toEqual(null);
    expect(mail_state.last_updated).toEqual(null);
    expect(mail_state.request_failures).toEqual(0);
  });

  it('urls', function() {
    var mail_state = new MailState(2);
    expect(mail_state.get_gmail_url()).toEqual(
      "https://mail.google.com/mail/u/2/");
    expect(mail_state.get_feed_url()).toEqual(
      "https://mail.google.com/mail/u/2/feed/atom/");
  });

  it('failed state', function() {
    var mail_state = new MailState(1);

    mail_state.fail();
    expect(mail_state.index).toEqual(1);
    expect(mail_state.email).toEqual(null);
    expect(mail_state.mail_count).toEqual(null);
    expect(mail_state.last_updated).toEqual(null);
    expect(mail_state.request_failures).toEqual(1);

    mail_state.fail();
    expect(mail_state.index).toEqual(1);
    expect(mail_state.email).toEqual(null);
    expect(mail_state.mail_count).toEqual(null);
    expect(mail_state.last_updated).toEqual(null);
    expect(mail_state.request_failures).toEqual(2);
  });

  it('updated state', function() {
    var mail_state = new MailState(2);
    mail_state.fail();
    mail_state.update('foo@bar.com', 5);
    expect(mail_state.index).toEqual(2);
    expect(mail_state.email).toEqual('foo@bar.com');
    expect(mail_state.mail_count).toEqual(5);
    expect(mail_state.last_updated).toEqual(null);
    expect(mail_state.request_failures).toEqual(0);
  });

  it('parse feed', function() {
    var mail_state = new MailState(1);
    var xml_text = '
<feed xmlns="http://purl.org/atom/ns#" version="0.3">
<title>Gmail - Inbox for test@foo.com</title>
<tagline>New messages in your Gmail Inbox</tagline>
<fullcount>533</fullcount>
<link rel="alternate" href="http://mail.google.com/mail/u/0" type="text/html"/>
<modified>2010-11-02T03:35:17Z</modified>
</feed>
';
    var xml = (new DOMParser()).parseFromString(xml_text, "text/xml");
    mail_state.parse_feed(xml);
    expect(mail_state.index).toEqual(1);
    expect(mail_state.email).toEqual('test@foo.com');
    expect(mail_state.mail_count).toEqual(533);
    expect(mail_state.last_updated).toEqual(null);
    expect(mail_state.request_failures).toEqual(0);
  });
});