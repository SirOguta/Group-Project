import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import puppeteer from "puppeteer";
import axios from "axios";
import { writeFile } from 'fs/promises'; // Add this import

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
        // Validate input
        if (!html || !email || !aircraftType || !date) {
            throw new Error("Missing required fields");
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error("Invalid recipient email address");
        }

        // Log Mailtrap config
        console.log("Mailtrap Config:", {
            token: process.env.MAILTRAP_TOKEN ? "Set" : "Unset",
            endpoint: process.env.MAILTRAP_ENDPOINT,
            clientUrl: process.env.CLIENT_URL
        });
        console.log("Mailtrap Token:", process.env.MAILTRAP_TOKEN); // Temporary debug

        // 1. Generate PDF
        const browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        console.log("HTML Input Length:", html.length);
        await page.setContent(html, { 
            waitUntil: 'networkidle0', 
            timeout: 30000 
        });
        
        const buffer = await page.pdf({ 
            format: 'A4', 
            printBackground: true 
        });
        console.log("PDF Buffer Size:", buffer.length);
        
        // Save PDF for inspection
        await writeFile('test.pdf', buffer);
        console.log("PDF saved to test.pdf for inspection");

        await browser.close();

        // 2. Validate PDF buffer
        if (!buffer || buffer.length === 0) {
            throw new Error("Generated PDF buffer is empty");
        }

        // 3. Convert to base64
        const base64Content = Buffer.from(buffer).toString('base64');
        console.log("Base64 Content Preview:", base64Content.substring(0, 100));
        
        // Validate base64
        const isValidBase64 = (str) => {
            try {
                return Buffer.from(str, 'base64').toString('base64') === str;
            } catch (e) {
                return false;
            }
        };
        if (!isValidBase64(base64Content)) {
            throw new Error("Invalid base64 encoding for PDF content");
        }

        // 4. Prepare email payload
        const emailData = {
            from: { email: "no-reply@yourapp.com" }, // Hardcoded for testing
            to: [{ email }],
            subject: `Weight and Balance Sheet - ${aircraftType} - ${date}`,
            text: `Attached is your Weight and Balance Sheet for ${aircraftType} generated on ${date}.`,
            attachments: [
                {
                    content: base64Content,
                    filename: `weight_balance_${aircraftType}_${date.replace(/[\/:]/g, '-')}.pdf`,
                    type: "application/pdf",
                    disposition: "attachment"
                }
            ]
        };
        console.log("Email Payload:", JSON.stringify(emailData, null, 2));

        // 5. Send to Mailtrap
        console.log("Axios Headers:", {
            Authorization: `Bearer ${process.env.MAILTRAP_TOKEN}`,
            "Content-Type": "application/json"
        });
        const mailtrapResponse = await axios.post(
            process.env.MAILTRAP_ENDPOINT,
            emailData,
            {
                headers: {
                    Authorization: `Bearer ${process.env.MAILTRAP_TOKEN}`,
                    "Content-Type": "application/json",
                },
                timeout: 30000
            }
        );

        res.json({ 
            success: true, 
            message: "PDF sent successfully" 
        });
        
    } catch (error) {
        console.error("Detailed error:", {
            message: error.message,
            stack: error.stack,
            responseData: error.response?.data,
            responseStatus: error.response?.status
        });
        
        let status = 500;
        let message = "Failed to process PDF";
        if (error.response?.status === 400) {
            status = 400;
            message = "Invalid email payload";
        } else if (error.response?.status === 401) {
            status = 401;
            message = "Invalid Mailtrap API token";
        } else if (error.response?.status === 429) {
            status = 429;
            message = "Mailtrap rate limit exceeded";
        }

        res.status(status).json({
            success: false,
            message,
            error: error.message,
            details: error.response?.data || "No additional details"
        });
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