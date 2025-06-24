import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import puppeteer from "puppeteer";
import { writeFile } from 'fs/promises';
import nodemailer from "nodemailer";
import { connectDB } from "./DATABASE/connectDB.js";
import authRoutes from "./routes/auth.route.js";
import weightBalanceRoutes from "./routes/weightBalance.route.js";

dotenv.config();

// Validate environment variables
const requiredEnv = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
const missingEnv = requiredEnv.filter(v => !process.env[v]);
if (missingEnv.length) {
  console.error('Missing environment variables:', missingEnv.join(', '));
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use('/api/weightbalance', weightBalanceRoutes);

app.post("/api/generate-pdf", async (req, res) => {
  const { html, email, aircraftType, date, download } = req.body;

  try {
    if (!html || !aircraftType || !date) {
      const missing = [];
      if (!html) missing.push('html');
      if (!aircraftType) missing.push('aircraftType');
      if (!date) missing.push('date');
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    const safeDate = date.replace(/[^a-zA-Z0-9]/g, '-');
    const safeAircraftType = aircraftType.replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `weight_balance_${safeAircraftType}_${safeDate}.pdf`;

    // If downloading
    if (download) {
     res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length, // Ensure this is a number
      });
    res.status(200).end(buffer, 'binary'); // Explicitly send as binary
    return;
}

    // If emailing
    if (!email) {
      throw new Error("Missing required field: email");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: '"Weight & Balance Bot" <no-reply@yourapp.com>',
      to: email,
      subject: `Weight and Balance Sheet - ${aircraftType} - ${date}`,
      text: `Attached is your Weight and Balance Sheet for ${aircraftType} on ${date}.`,
      attachments: [
        {
          filename,
          content: buffer,
          contentType: "application/pdf",
        },
      ],
    });

    return res.status(200).json({ success: true, message: "Email sent successfully" });

  } catch (error) {
    console.error("PDF Generation/Email Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});


if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "/FRONTEND/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "FRONTEND", "dist", "index.html"));
  });
}

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log("Server is running on port:", PORT);
  });
}).catch(err => {
  console.error("Failed to connect to DB", err);
  process.exit(1);
});
