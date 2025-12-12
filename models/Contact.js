const mongoose = require("mongoose");

const ContactSchema = new mongoose.Schema(
  {
    // --- Sender Information ---
    name: {
      type: String,
      required: [true, "A name is required to submit the form"],
      trim: true,
      maxlength: [50, "Name cannot be more than 50 characters"],
    },
    email: {
      type: String,
      required: [true, "An email address is required"],
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{3}|[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please add a valid email address",
      ],
    },

    // --- Message Content ---
    message: {
      type: String,
      required: [true, "A message body is required"],
      // minlength: [10, "Message must be at least 10 characters long"],
      // maxlength: [1000, "Message cannot exceed 1000 characters"],
    },

    // --- Metadata ---
    // If you plan to respond and track status (e.g., 'new', 'read', 'archived')
    status: {
      type: String,
      enum: ["new", "read", "archived"],
      default: "new",
    },
  },
  { timestamps: true }
); // timestamps adds createdAt and updatedAt fields automatically

const Contact = mongoose.model("Contact", ContactSchema);
module.exports = Contact;
