const nodemailer = require("nodemailer");

const sendWithResend = async (email, subject, html) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [email],
      subject,
      html,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const error = new Error(`Email provider rejected the request (${response.status})`);
    error.code = "RESEND_API_ERROR";
    error.statusCode = 502;
    throw error;
  }

  const result = await response.json();
  console.log("Email sent", { provider: "resend", messageId: result.id });
};

const sendWithSmtp = async (email, subject, html) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number.parseInt(process.env.SMTP_PORT, 10) || 465,
    secure: process.env.SMTP_SECURE !== "false",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: `"MyEcomS" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html,
  });
  console.log("Email sent", { provider: "smtp", messageId: info.messageId });
};

const sendEmail = async (email, subject, html) => {
  try {
    if (process.env.RESEND_API_KEY) {
      await sendWithResend(email, subject, html);
    } else {
      await sendWithSmtp(email, subject, html);
    }
  } catch (err) {
    console.error("Email delivery failed", {
      error: err.name,
      code: err.code,
      command: err.command,
      responseCode: err.responseCode,
    });
    throw err;
  }
};

module.exports = sendEmail;
