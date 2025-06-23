import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // use TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Optional: test connection
transporter.verify((err, success) => {
  if (err) {
    console.error("❌ SMTP config error:", err);
  } else {
    console.log("✅ SMTP ready");
  }
});


