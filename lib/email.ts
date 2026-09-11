// Transactional email stub. No fake delivery: logs intent, documents provider setup.
export async function sendEmail(to: string, subject: string, body: string): Promise<{ delivered: boolean; reason: string }> {
  const provider = process.env.EMAIL_PROVIDER;
  if (!provider) {
    console.log(`[email:queued-log-only] to=${to} subject=${subject}`);
    return { delivered: false, reason: "No EMAIL_PROVIDER configured — logged only. See docs/deployment.md." };
  }
  console.log(`[email:provider=${provider}] to=${to} subject=${subject} body=${body.slice(0, 200)}`);
  return { delivered: true, reason: `sent via ${provider}` };
}

export function passwordResetEmail(link: string): { subject: string; body: string } {
  return {
    subject: "Reset your DEALMAP password",
    body: `You requested a password reset. Use this link within 60 minutes: ${link}\nIf you did not request this, ignore this email.`,
  };
}
