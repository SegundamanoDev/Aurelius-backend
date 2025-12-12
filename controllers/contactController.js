// contactController.js

const asyncHandler = require("../middleware/asyncHandler");
const Contact = require("../models/Contact");
const sendEmail = require("../utils/sendEmail");

// @desc    Handle new contact form submission
// @route   POST /api/v1/contact
// @access  Public
exports.submitContactForm = asyncHandler(async (req, res, next) => {
  // 1. Save the message to the database first (Crucial backup)
  const message = await Contact.create(req.body); // 2. Define the email notification content

  const emailMessage = `
        <p>You have a new message from your portfolio site!</p>
        <hr>
        <strong>Name:</strong> ${message.name}<br>
        <strong>Email:</strong> ${message.email}<br>
        <strong>Message:</strong><br>
        <p style="white-space: pre-wrap; padding: 10px; border: 1px solid #ccc; background: #f9f9f9;">${message.message}</p>
        <hr>
        <p>Please respond directly to ${message.email}.</p>
    `;

  try {
    // 3. Send the email notification to your personal address
    // Renamed 'res' to 'emailInfo' to prevent overwriting the Express 'res' object
    const emailInfo = await sendEmail({
      email: process.env.SMTP_USER, // Email address to notify
      subject: `NEW PORTFOLIO INQUIRY from ${message.name}`,
      message: emailMessage, // The HTML formatted message
    });
    console.log("Email Sent Successfully. Info:", emailInfo); // 4. Send Success Response using the *Express* res object

    res.status(201).json({
      success: true,
      message: "Thank you! Your message has been sent successfully.",
    });
  } catch (err) {
    console.error("Nodemailer Error: Email notification failed.", err.message); // Important: Return success because the message IS saved. // The user doesn't need to know the *internal* notification failed.
    res.status(201).json({
      success: true,
      message:
        "Message saved, but the notification email to the owner failed (check server logs).",
    });
  }
});
