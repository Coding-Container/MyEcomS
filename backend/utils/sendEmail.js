const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },
});

const sendEmail = async (email, subject, html) => {
  await transporter.sendMail({
    from: `"MyEcomS" <${process.env.BREVO_USER}>`,
    to: email,
    subject,
    html,
  });
};

module.exports = sendEmail;