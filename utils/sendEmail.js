const nodemailer = require("nodemailer");

/**
 * @desc Sends an email notification using Nodemailer
 * @param {Object} options - Contains to, subject, and message body.
 */
const sendEmail = async (options) => {
  // 1. Create a transporter object using the SMTP settings from the .env file
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // 2. Define the email content
  const message = {
    from: `${process.env.SMTP_USER}`, // Sender address
    to: options.email, // Recipient address (Your personal email)
    subject: options.subject, // Subject line
    html: options.message, // Email body in HTML format (can also use text)
  };

  // 3. Send the email
  await transporter.sendMail(message);
};

module.exports = sendEmail;
