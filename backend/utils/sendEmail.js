const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (email, subject, html) => {
  await resend.emails.send({
    from: "MyEcomS <onboarding@resend.dev>",
    to: email,
    subject,
    html,
  });
};

module.exports = sendEmail;
