const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

const sendEmail = async (email, subject, html) => {
  try {
    await transporter.verify();
    console.log("SMTP Connected Successfully");

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html,
    });

    console.log("Mail Sent");
  } catch (err) {
    console.error("SMTP ERROR:", err);
    throw err;
  }
};

module.exports = sendEmail;