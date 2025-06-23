import { transporter } from "./email.config.js";
import {
  PASSWORD_RESET_REQUEST_TEMPLATE,
  PASSWORD_RESET_SUCCESS_TEMPLATE,
  VERIFICATION_EMAIL_TEMPLATE,
} from "./emailTemplates.js";

// Send verification email
export const sendVerificationEmail = async (email, verificationToken) => {
  try {
    await transporter.sendMail({
      from: `"Your App Name" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Verify Your Email",
      html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", verificationToken),
    });

    console.log("Verification email sent successfully");
  } catch (error) {
    console.error("Full error:", error); 
    throw new Error("Could not send verification email");
  }
};

// Send welcome email
export const sendWelcomeEmail = async (email, name) => {
  try {
    await transporter.sendMail({
      from: `"Your App Name" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Welcome to Auth Company",
      html: `<p>Hi ${name}, welcome to Auth Company!</p>`,
    });

    console.log("Welcome email sent successfully");
  } catch (error) {
    console.error("Error sending welcome email:", error.message);
    throw new Error("Could not send welcome email");
  }
};

// Send password reset request email
export const sendPasswordResetEmail = async (email, resetURL) => {
  try {
    await transporter.sendMail({
      from: `"Your App Name" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Reset Your Password",
      html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL),
    });

    console.log("Password reset request email sent successfully");
  } catch (error) {
    console.error("Error sending password reset email:", error.message);
    throw new Error("Could not send password reset email");
  }
};

// Send password reset success email
export const sendResetSuccessEmail = async (email) => {
  try {
    await transporter.sendMail({
      from: `"Your App Name" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Password Reset Successful",
      html: PASSWORD_RESET_SUCCESS_TEMPLATE,
    });

    console.log("Password reset success email sent successfully");
  } catch (error) {
    console.error("Error sending password reset success email:", error.message);
    throw new Error("Could not send password reset success email");
  }
};
