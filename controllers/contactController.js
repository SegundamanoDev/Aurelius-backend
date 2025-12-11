const asyncHandler = require("../middleware/asyncHandler");
const Contact = require("../models/Contact");
const sendEmail = require("../utils/sendEmail"); // <-- New Import

// @desc    Handle new contact form submission
// @route   POST /api/v1/contact
// @access  Public
exports.submitContactForm = asyncHandler(async (req, res, next) => {
  // 1. Save the message to the database first (Crucial backup)
  const message = await Contact.create(req.body);

  // 2. Define the email notification content
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
    await sendEmail({
      email: process.env.SMTP_USER, // Email address to notify
      subject: `NEW PORTFOLIO INQUIRY from ${message.name}`,
      message: emailMessage, // The HTML formatted message
    });

    // 4. Send Success Response
    res.status(201).json({
      success: true,
      message: "Thank you! Your message has been sent successfully.",
    });
  } catch (err) {
    console.error("Nodemailer Error: Email notification failed.", err);
    // Important: If the email fails, we still return success (201) to the user
    // because the message IS saved in the database (step 1), preventing a lost lead.
    // We log the error on the server side for debugging.
    res.status(201).json({
      success: true,
      message:
        "Message saved, but notification email failed to send (check server logs).",
    });
  }
});
