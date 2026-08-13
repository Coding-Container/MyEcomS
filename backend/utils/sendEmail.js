const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },
});

const sendEmail = async (email, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"MyEcomS" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html,
    });

    console.log("Email Sent:", info.messageId);
  } catch (err) {
    console.error("SMTP ERROR:", err);
    throw err;
  }
};

module.exports = sendEmail;
