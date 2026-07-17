const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (email, subject, html) => {
  try {
    const data = await resend.emails.send({
      from: "MyEcomS <onboarding@resend.dev>",
      to: email,
      subject,
      html,
    });

    console.log("Email Sent:", data);
  } catch (err) {
    console.error("Resend Error:", err);
    throw err;
  }
};

module.exports = sendEmail;
