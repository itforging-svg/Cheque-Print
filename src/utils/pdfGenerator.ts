import { jsPDF } from "jspdf";
import { numberToWords } from "./numberToWords";

export interface PrinterProfile {
  feedOrientation: "portrait" | "landscape";
  feedAlignment: "center" | "left" | "right";
  offsetX: number; // in mm
  offsetY: number; // in mm
}

export interface ChequeRecord {
  payeeName: string;
  amount: number;
  chequeDate: string; // YYYY-MM-DD
  bankName: string;
  acPayee: boolean;
  notes?: string;
}

// Map logical coordinates of a 202x92mm cheque to A4 (210x297mm) based on printer profile
function getA4Coords(
  rx: number,
  ry: number,
  profile: PrinterProfile
): { x: number; y: number; angle: number } {
  const { feedOrientation, feedAlignment, offsetX, offsetY } = profile;
  
  // A4 dimensions
  const A4_W = 210;
  
  // Cheque dimensions
  const CH_W = 202;
  const CH_H = 92;

  let xMargin = 0;

  if (feedOrientation === "landscape") {
    // Landscape: cheque is 202mm wide, A4 is 210mm wide
    if (feedAlignment === "left") {
      xMargin = 0;
    } else if (feedAlignment === "center") {
      xMargin = (A4_W - CH_W) / 2; // 4mm
    } else {
      xMargin = A4_W - CH_W; // 8mm
    }
    
    return {
      x: xMargin + rx + offsetX,
      y: ry + offsetY,
      angle: 0
    };
  } else {
    // Portrait: short edge enters first (rotated 90 deg clockwise)
    // The cheque height (92mm) sits along the width of A4 (210mm)
    if (feedAlignment === "left") {
      xMargin = 0;
    } else if (feedAlignment === "center") {
      xMargin = (A4_W - CH_H) / 2; // 59mm
    } else {
      xMargin = A4_W - CH_H; // 118mm
    }
    
    // Rotate 90 deg clockwise:
    // rx_rotated = 92 - ry
    // ry_rotated = rx
    return {
      x: xMargin + (CH_H - ry) + offsetX,
      y: rx + offsetY,
      angle: 270 // 270 deg (drawn bottom-to-top relative to A4 page, which is 90 deg clockwise relative to feed)
    };
  }
}

// Helper to draw text or lines on A4 canvas
function drawChequeElements(
  doc: jsPDF,
  cheque: ChequeRecord,
  profile: PrinterProfile
) {
  const { payeeName, amount, chequeDate, acPayee } = cheque;
  
  // Format Date (DDMMYYYY)
  const dateParts = chequeDate.split("-");
  let dateDigits = "        ";
  if (dateParts.length === 3) {
    const year = dateParts[0];  // YYYY
    const month = dateParts[1]; // MM
    const day = dateParts[2];   // DD
    dateDigits = `${day}${month}${year}`;
  } else {
    const cleanDate = chequeDate.replace(/[^0-9]/g, "");
    dateDigits = cleanDate.padEnd(8, " ").substring(0, 8);
  }

  // Helper functions
  const printText = (text: string, rx: number, ry: number, fontSize = 10, isBold = false) => {
    doc.setFont("courier", isBold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    
    const { x, y, angle } = getA4Coords(rx, ry, profile);
    doc.text(text, x, y, { angle: angle });
  };

  const printLine = (rx1: number, ry1: number, rx2: number, ry2: number, lineWidth = 0.2) => {
    doc.setLineWidth(lineWidth);
    
    const p1 = getA4Coords(rx1, ry1, profile);
    const p2 = getA4Coords(rx2, ry2, profile);
    
    doc.line(p1.x, p1.y, p2.x, p2.y);
  };

  // 1. Draw A/C Payee Crossing if enabled
  if (acPayee) {
    // Draw two parallel lines at top left
    printLine(0, 22, 22, 0, 0.4);
    printLine(0, 28, 28, 0, 0.4);
    
    // Write text inside. Since the crossing is 45 deg, we place it at midpoint
    // Relative to cheque (approx rx=5.2, ry=20.3 to center 9.0pt text baseline)
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    
    // Adjust drawing angle based on page feed rotation:
    // In Landscape, the text flows from left-down to right-up, which is 45 deg counter-clockwise.
    // In Portrait, because the whole cheque is rotated 90 deg clockwise, the angle is 45 - 90 = -45 = 315 deg.
    const textAngle = profile.feedOrientation === "landscape" ? 45 : 315;
    const midPoint = getA4Coords(5.2, 20.3, profile);
    doc.text("A/C PAYEE ONLY", midPoint.x, midPoint.y, { angle: textAngle });
  }

  // 2. Draw Date Digits
  // Standard CTS-2010 spacing: Box is approx 148-198mm from left, 8mm from top
  // Digits separated by approx 4.8mm
  const dateStartRx = 149.0;
  const dateRy = 11.0;
  for (let i = 0; i < 8; i++) {
    printText(dateDigits[i], dateStartRx + i * 5.0, dateRy, 12, true);
  }

  // 3. Draw Payee Name
  // Typically starts around 25mm from left, 21mm from top
  printText(payeeName, 26, 20.5, 11, true);

  // 4. Draw Amount in Words
  // Starts around 32mm from left, 30mm from top
  // Indian numbering word translation
  const words = numberToWords(amount);
  
  // Wrap words to fit cheque width.
  // First line can take approx 45 characters, second line starts at 15mm from left, 39mm from top
  const maxLine1Chars = 48;
  if (words.length <= maxLine1Chars) {
    printText(words, 30, 29.5, 10, true);
  } else {
    // Find last space before max chars
    let splitIdx = words.lastIndexOf(" ", maxLine1Chars);
    if (splitIdx === -1) splitIdx = maxLine1Chars;
    
    const line1 = words.substring(0, splitIdx);
    const line2 = words.substring(splitIdx).trim();
    
    printText(line1, 30, 29.5, 10, true);
    printText(line2, 16, 37.5, 10, true);
  }

  // 5. Draw Amount in Figures
  // Standard ₹ box is at 152-192mm, 41-52mm. We write the number centered
  const formattedAmount = amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  printText(`**${formattedAmount}/-`, 157.0, 41.0, 10.0, true);
}

// Generate PDF for a single cheque
export function generateChequePDF(cheque: ChequeRecord, profile: PrinterProfile): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait", // A4 page is portrait
    unit: "mm",
    format: "a4"
  });

  drawChequeElements(doc, cheque, profile);
  return doc;
}

// Generate PDF for bulk cheques (multi-page)
export function generateBulkChequesPDF(cheques: ChequeRecord[], profile: PrinterProfile): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  cheques.forEach((cheque, index) => {
    if (index > 0) {
      doc.addPage("a4", "portrait");
    }
    drawChequeElements(doc, cheque, profile);
  });

  return doc;
}

// Generate a Grid-based calibration page
export function generateCalibrationPDF(profile: PrinterProfile): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const A4_W = 210;
  const A4_H = 297;

  doc.setDrawColor(200, 200, 200); // Soft grey grid
  doc.setLineWidth(0.1);

  // 1. Draw 10mm Grid lines
  for (let x = 10; x < A4_W; x += 10) {
    doc.line(x, 0, x, A4_H);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text(`${x}mm`, x + 1, 10);
  }
  for (let y = 10; y < A4_H; y += 10) {
    doc.line(0, y, A4_W, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text(`${y}mm`, 5, y - 1);
  }

  // 2. Draw Cheque target area WITHOUT offsets (Dotted outline)
  doc.setDrawColor(239, 68, 68); // Red
  doc.setLineWidth(0.4);
  // Dotted style in jsPDF:
  // Using setLineDashPattern
  doc.setLineDashPattern([2, 2], 0);

  // Math for cheque boundaries
  const CH_W = 202;
  const CH_H = 92;
  let baseLeft = 0;
  
  if (profile.feedOrientation === "landscape") {
    baseLeft = profile.feedAlignment === "left" ? 0 : 
               profile.feedAlignment === "center" ? (A4_W - CH_W) / 2 : 
               (A4_W - CH_W);
    
    // Draw target box (dotted)
    doc.rect(baseLeft, 0, CH_W, CH_H);
    
    // Draw calibrated box (solid)
    doc.setDrawColor(16, 185, 129); // Green
    doc.setLineDashPattern([], 0); // Solid
    doc.rect(baseLeft + profile.offsetX, profile.offsetY, CH_W, CH_H);

    // Label
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Calibration Target: ${profile.feedOrientation.toUpperCase()} - ${profile.feedAlignment.toUpperCase()}`, baseLeft + 15, 30);
    doc.text(`Offset X: ${profile.offsetX}mm, Offset Y: ${profile.offsetY}mm`, baseLeft + 15, 38);
    
  } else {
    baseLeft = profile.feedAlignment === "left" ? 0 : 
               profile.feedAlignment === "center" ? (A4_W - CH_H) / 2 : 
               (A4_W - CH_H);
    
    // Target Box (dotted)
    doc.rect(baseLeft, 0, CH_H, CH_W);
    
    // Calibrated Box (solid)
    doc.setDrawColor(16, 185, 129); // Green
    doc.setLineDashPattern([], 0); // Solid
    doc.rect(baseLeft + profile.offsetX, profile.offsetY, CH_H, CH_W);

    // Label
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    // Draw label rotated because portrait is printed rotated
    doc.text(`Calibration Target: ${profile.feedOrientation.toUpperCase()} - ${profile.feedAlignment.toUpperCase()}`, baseLeft + 25, 40, { angle: 270 });
    doc.text(`Offset X: ${profile.offsetX}mm, Offset Y: ${profile.offsetY}mm`, baseLeft + 18, 40, { angle: 270 });
  }

  // Guidelines instructions at bottom of grid
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("HOW TO CALIBRATE YOUR PRINTER:", 15, 250);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("1. Print this sheet onto standard A4 paper.", 15, 256);
  doc.text("2. Align a physical cheque against the printed boxes.", 15, 262);
  doc.text("3. Measure the horizontal (X) and vertical (Y) offset error in millimeters.", 15, 268);
  doc.text("4. If the print needs to move Right, increase offsetX (+). If it needs to move Left, decrease it (-).", 15, 274);
  doc.text("5. If the print needs to move Down, increase offsetY (+). If it needs to move Up, decrease it (-).", 15, 280);

  return doc;
}
