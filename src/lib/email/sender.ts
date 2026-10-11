// The one place that decides who our emails come from. Brevo only accepts
// senders registered in the Brevo account, and its authenticated domain is
// talkpush.com. It silently drops mail from anything else (the API call still
// succeeds, the send is rejected afterwards), so keep this on a registered
// sender. Replies from recipients go to this mailbox.
export const EMAIL_SENDER = {
  name: "Talkpush Ops Team",
  email: "operations@talkpush.com",
} as const
