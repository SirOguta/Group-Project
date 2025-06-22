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

const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use('/api/weightbalance', weightBalanceRoutes);

app.post("/api/generate-pdf", async (req, res) => {
  const { html, email, aircraftType, date } = req.body;

  try {
    if (!html || !email || !aircraftType || !date) {
      throw new Error("Missing required fields");
    }

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    // Save for debug
    await writeFile("test_nodemailer.pdf", buffer);

    // Configure Nodemailer transport
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Send email with PDF
    await transporter.sendMail({
      from: '"Weight & Balance Bot" <no-reply@yourapp.com>',
      to: email,
      subject: `Weight and Balance Sheet - ${aircraftType} - ${date}`,
      text: `Attached is your Weight and Balance Sheet for ${aircraftType} generated on ${date}.`,
      attachments: [
        {
          filename: `weight_balance_${aircraftType}_${date.replace(/[\/:]/g, '-')}.pdf`,
          content: buffer,
        },
      ],
    });

    res.json({ success: true, message: "PDF emailed successfully via Nodemailer" });

  } catch (error) {
    console.error("Nodemailer Error:", error);
    res.status(500).json({ success: false, message: "Email failed", error: error.message });
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