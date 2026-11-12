const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number.parseInt(process.env.SMTP_PORT, 10) || 465,
  secure: process.env.SMTP_SECURE !== "false",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
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

    console.log("Email sent", { messageId: info.messageId });
  } catch (err) {
    console.error("Email delivery failed", { error: err.name });
    throw err;
  }
};

module.exports = sendEmail;
