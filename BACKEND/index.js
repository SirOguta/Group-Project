import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { load } from "cheerio";
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
  const { html, email, aircraftType, date, pilotName, route, registration, graphImages, download = false } = req.body;

  try {
    // Validate input
    if (!html || !aircraftType || !date || !pilotName || !route || !registration) {
      const missing = [];
      if (!html) missing.push('html');
      if (!aircraftType) missing.push('aircraftType');
      if (!date) missing.push('date');
      if (!pilotName) missing.push('pilotName');
      if (!route) missing.push('route');
      if (!registration) missing.push('registration');
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    if (!download && (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))) {
      throw new Error('Valid email is required for sending PDF');
    }

    // Validate graphImages
    if (graphImages && !Array.isArray(graphImages)) {
      throw new Error('graphImages must be an array');
    }
    if (graphImages) {
      graphImages.forEach((img, i) => {
        if (img !== null && (typeof img !== 'string' || !img.startsWith('data:image/png;base64,'))) {
          console.warn(`Invalid graphImages[${i}]: must be a base64 PNG string or null`);
        }
      });
      console.log(`Received ${graphImages.length} graph images`);
    }

    // Parse HTML with cheerio
    console.log('Received HTML (first 500 chars):', html.substring(0, 500));
    const $ = load(html);
    const title = $('h1, h2, h3').first().text().trim() || 'Weight & Balance Sheet';
    const tableData = [];
    $('table tr').each((i, row) => {
      const rowData = [];
      $(row).find('th, td').each((j, cell) => {
        const text = $(cell).find('span').length > 0 ? $(cell).find('span').text().trim() : $(cell).text().trim();
        rowData.push(text || '0'); // Use '0' for empty cells
      });
      if (rowData.length > 0) {
        tableData.push(rowData);
      }
    });
    console.log('Parsed tableData:', JSON.stringify(tableData, null, 2));

    // Generate PDF with jsPDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Page dimensions (A4: 210mm wide, 297mm tall)
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;
    const maxContentHeight = pageHeight - margin * 2;
    let currentY = margin;

    // 1. Pilot and Flight Information
    doc.setFontSize(14);
    doc.text('Pilot and Flight Information', margin, currentY);
    currentY += 10;
    doc.setFontSize(12);
    doc.text(`Pilot Name: ${pilotName}`, margin, currentY);
    currentY += 7;
    doc.text(`Route: ${route}`, margin, currentY);
    currentY += 7;
    doc.text(`Aircraft Registration: ${registration}`, margin, currentY);
    currentY += 7;
    doc.text(`Date: ${date}`, margin, currentY);
    currentY += 10;

    // Check for page break
    if (currentY + 60 > maxContentHeight) {
      doc.addPage();
      currentY = margin;
    }

    // 2. Loadsheet
    doc.setFontSize(14);
    doc.text('Loadsheet', margin, currentY);
    currentY += 10;
    if (tableData.length > 0) {
      try {
        autoTable(doc, {
          startY: currentY,
          head: [tableData[0]],
          body: tableData.slice(1),
          margin: { top: margin, right: margin, bottom: margin, left: margin },
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [100, 100, 100], textColor: [255, 255, 255] },
          columnStyles: { 0: { cellWidth: 'auto' } },
        });
        currentY = doc.lastAutoTable.finalY + 10;
      } catch (err) {
        console.error('Error generating table:', err);
        doc.setFontSize(12);
        doc.text('Failed to render loadsheet table.', margin, currentY);
        currentY += 10;
      }
    } else {
      doc.setFontSize(12);
      doc.text('No table data found in provided HTML.', margin, currentY);
      currentY += 10;
    }

    // 3. C.O.G Moment Envelope and 4. Loading Graph
    if (graphImages && graphImages.length > 1) {
      const imageWidth = pageWidth - 2 * margin; // 190mm
      const imageHeights = [100, 120]; // CoG: 100mm, Loading: 120mm
      const titles = ['C.O.G Moment Envelope', 'Loading Graph'];

      for (let index = 1; index <= 2; index++) {
        if (!graphImages[index]) {
          console.warn(`Skipping graph image ${index} as it is null`);
          continue;
        }
        try {
          const imageHeight = imageHeights[index - 1] || 100;
          if (currentY + imageHeight + 20 > maxContentHeight) {
            doc.addPage();
            currentY = margin;
          }
          doc.setFontSize(14);
          doc.text(titles[index - 1], margin, currentY);
          currentY += 10;
          doc.addImage(graphImages[index], 'PNG', margin, currentY, imageWidth, imageHeight);
          console.log(`Added graph image ${index} at y=${currentY} with height=${imageHeight}`);
          currentY += imageHeight + 10;
        } catch (err) {
          console.error(`Error adding graph image ${index}:`, err);
          continue;
        }
      }
    }

    // Generate buffer
    const buffer = Buffer.from(doc.output('arraybuffer'));
    const safeDate = date.replace(/[^a-zA-Z0-9]/g, '-');
    const safeAircraftType = aircraftType.replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `weight_and_balance_${safeAircraftType}_${safeDate}.pdf`;

    // Download PDF
    if (download) {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length,
      });
      return res.status(200).end(buffer, 'binary');
    }

    // Email PDF
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_PORT === '465',
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
          contentType: 'application/pdf',
        },
      ],
    });

    return res.status(200).json({ success: true, message: 'Email sent successfully' });

  } catch (error) {
    console.error('PDF Generation/Email Error:', {
      message: error.message,
      stack: error.stack,
      body: {
        htmlLength: html?.length || 0,
        graphImagesCount: graphImages?.length || 0,
        download,
        aircraftType,
        date,
        pilotName,
        route,
        registration,
      },
    });
    res.status(500).json({ success: false, message: `Internal server error: ${error.message}` });
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
