const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  // 1. Create a transporter for Gmail
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true, // Use true for port 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Your Gmail App Password
    },
  });

  // 2. Define the email options
  const mailOptions = {
    from: `Aurelius Capital <${process.env.EMAIL_FROM}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  // 3. Send the email
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new Error("Email could not be sent.");
  }
};

module.exports = sendEmail;
