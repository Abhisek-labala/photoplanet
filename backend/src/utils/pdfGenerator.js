const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

function formatCurrency(amount, symbol = 'Rs. ') {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `${symbol}0.00`;
  }
  const parts = Math.abs(amount).toFixed(2).split('.');
  let lastThree = parts[0].substring(parts[0].length - 3);
  const otherNumbers = parts[0].substring(0, parts[0].length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const sign = amount < 0 ? '-' : '';
  return `${sign}${symbol}${formattedInteger}.${parts[1]}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function resolveLogo(settings) {
  // 1. Direct base64 data URI from settings
  if (settings && settings.logo && typeof settings.logo === 'string') {
    if (settings.logo.startsWith('data:image')) {
      try {
        const parts = settings.logo.split(',');
        if (parts.length > 1) {
          return Buffer.from(parts[1], 'base64');
        }
      } catch {
        // ignore and fallback
      }
    }
  }

  // 2. File name or relative path from settings or default logo.jpg
  const customFile = (settings && settings.logo && typeof settings.logo === 'string' && !settings.logo.startsWith('data:'))
    ? settings.logo.replace(/^\//, '')
    : null;

  const candidateNames = customFile ? [customFile, 'logo.jpg'] : ['logo.jpg'];
  const baseDirs = [
    path.resolve(__dirname, '..', '..', 'public'),                   // backend/public
    path.resolve(__dirname, '..', '..', '..', 'frontend', 'public'), // frontend/public
    path.resolve(__dirname, '..', '..', '..', 'frontend', 'dist'),   // frontend/dist
    path.resolve(process.cwd(), 'public'),                            // cwd/public
    path.resolve(process.cwd(), '..', 'frontend', 'public')           // cwd/../frontend/public
  ];

  for (const name of candidateNames) {
    for (const dir of baseDirs) {
      const fullPath = path.join(dir, name);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }

  return null;
}

/**
 * Status badge styling helper to match getStatusBadgeClass in frontend print view
 */
function getStatusColors(status) {
  switch (status) {
    case 'Sent':
      return { bg: '#e0f2fe', border: '#7dd3fc', text: '#0369a1' };
    case 'Accepted':
    case 'Confirmed':
      return { bg: '#dcfce7', border: '#86efac', text: '#15803d' };
    case 'Converted to Booking':
      return { bg: '#e0e7ff', border: '#a5b4fc', text: '#4338ca' };
    case 'Rejected':
      return { bg: '#ffe4e6', border: '#fca5a5', text: '#be123c' };
    case 'Enquiry':
      return { bg: '#fef3c7', border: '#fcd34d', text: '#b45309' };
    case 'Draft':
    default:
      return { bg: '#f1f5f9', border: '#cbd5e1', text: '#475569' };
  }
}

/**
 * Generate a pristine A4 PDF stream for a quotation that visually mirrors the Print view
 */
function generateQuotationPdf(quotation, events, paymentTerms, settings, dataStream) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 36, // 0.5 inch (12.7mm) margins
    info: {
      Title: `Quotation ${quotation.quotation_number}`,
      Author: settings.studio_name || 'PHOTO PLANET STUDIO',
      Subject: `Quotation for ${quotation.client_name}`
    }
  });

  doc.pipe(dataStream);

  // Currency symbol (Helvetica WinAnsi encoding: use 'Rs. ' to avoid unmapped glyphs)
  let currencySymbol = settings.currency_symbol || 'Rs. ';
  if (!currencySymbol || currencySymbol === '₹' || currencySymbol.includes('₹')) {
    currencySymbol = 'Rs. ';
  } else if (!currencySymbol.endsWith(' ')) {
    currencySymbol = currencySymbol + ' ';
  }

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 36;
  const contentWidth = pageWidth - (margin * 2); // 523.28

  // Logo setup
  const logo = resolveLogo(settings);
  const logoSize = 52;

  // Header Letterhead
  let currentY = margin;

  if (logo) {
    try {
      doc.save();
      doc.roundedRect(margin, currentY, logoSize, logoSize, 8).clip();
      doc.image(logo, margin, currentY, { width: logoSize, height: logoSize });
      doc.restore();
      doc.roundedRect(margin, currentY, logoSize, logoSize, 8).lineWidth(0.75).strokeColor('#cbd5e1').stroke();
    } catch {
      try {
        doc.image(logo, margin, currentY, { width: logoSize, height: logoSize });
      } catch {
        // silent fallback
      }
    }
  }

  const headerTextX = logo ? margin + 62 : margin;

  // Studio Details (matches .print-studio-info in printStyles.ts)
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#0f172a')
    .text((settings.studio_name || 'STUDIO PHOTOGRAPHY').toUpperCase(), headerTextX, currentY);

  if (settings.tagline) {
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#475569')
      .text(settings.tagline, headerTextX, doc.y + 1);
  }

  let addressLine = '';
  if (settings.address) addressLine += settings.address;
  if (settings.city) addressLine += (addressLine ? `, ${settings.city}` : settings.city);
  if (settings.pincode) addressLine += ` - ${settings.pincode}`;

  let contactLine = '';
  if (settings.phone) contactLine += `Ph: ${settings.phone} `;
  if (settings.email) contactLine += (contactLine ? `• Email: ${settings.email}` : `Email: ${settings.email}`);

  if (addressLine) {
    doc.fontSize(7.5).font('Helvetica').fillColor('#64748b')
      .text(addressLine, headerTextX, doc.y + 2, { width: 310, lineGap: 1 });
  }
  if (contactLine) {
    doc.fontSize(7.5).font('Helvetica').fillColor('#64748b')
      .text(contactLine, headerTextX, doc.y + 1, { width: 310, lineGap: 1 });
  }
  if (settings.gst_number) {
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#1e293b')
      .text(`GSTIN: ${settings.gst_number}`, headerTextX, doc.y + 1);
  }
  const leftBottomY = doc.y;

  // Top Right Quotation Meta (matches .print-quote-meta in printStyles.ts)
  const badgeWidth = 90;
  const badgeHeight = 18;
  const badgeX = pageWidth - margin - badgeWidth;

  // QUOTATION Dark Badge (matches .print-quote-badge in printStyles.ts)
  doc.roundedRect(badgeX, currentY, badgeWidth, badgeHeight, 5).fill('#0f172a');
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#ffffff')
    .text('QUOTATION', badgeX, currentY + 4.5, { width: badgeWidth, align: 'center', characterSpacing: 1.5 });

  // Quote No and Date below badge
  const metaY = currentY + badgeHeight + 5;
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a')
    .text(`Quote No: ${quotation.quotation_number}`, badgeX - 60, metaY, { width: badgeWidth + 60, align: 'right' });

  doc.fontSize(8).font('Helvetica').fillColor('#475569')
    .text(`Date: ${formatDate(quotation.quotation_date)}`, badgeX - 60, doc.y + 2, { width: badgeWidth + 60, align: 'right' });

  const rightBottomY = doc.y;

  // Executive Divider Line (matches border-b-2 border-slate-900 in print)
  currentY = Math.max(leftBottomY, rightBottomY, currentY + 54) + 8;
  doc.strokeColor('#0f172a').lineWidth(2).moveTo(margin, currentY).lineTo(pageWidth - margin, currentY).stroke();
  currentY += 10;

  // Client & Quotation Meta Box (matches .print-meta-grid in printStyles.ts)
  const clientBoxY = currentY;
  
  // Left: Quotation Issued To
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#94a3b8')
    .text('QUOTATION ISSUED TO:', margin, clientBoxY, { characterSpacing: 0.8 });
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a')
    .text(quotation.client_name, margin, clientBoxY + 11);

  let cY = doc.y + 1;
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569')
    .text('Mobile: ', margin, cY, { continued: true })
    .font('Helvetica').fillColor('#0f172a').text(quotation.client_mobile);

  if (quotation.client_email) {
    cY = doc.y + 1;
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569')
      .text('Email: ', margin, cY, { continued: true })
      .font('Helvetica').fillColor('#0f172a').text(quotation.client_email);
  }

  if (quotation.client_address) {
    cY = doc.y + 1;
    const addr = `${quotation.client_address}${quotation.client_city ? `, ${quotation.client_city}` : ''}`;
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569')
      .text('Address: ', margin, cY, { continued: true, width: 280 })
      .font('Helvetica').fillColor('#0f172a').text(addr, { width: 280 });
  }
  const clientBottom = doc.y;

  // Right: Status & Account (matches .print-account-box in printStyles.ts)
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#94a3b8')
    .text('STATUS & ACCOUNT:', pageWidth - margin - 180, clientBoxY, { width: 180, align: 'right', characterSpacing: 0.8 });

  // Status Pill Badge (matches .print-status-pill in printStyles.ts)
  const statusColors = getStatusColors(quotation.status);
  const statusText = (quotation.status || 'DRAFT').toUpperCase();
  const statusPillW = Math.max(60, doc.widthOfString(statusText, { font: 'Helvetica-Bold', size: 7.5 }) + 16);
  const statusPillH = 15;
  const statusPillX = pageWidth - margin - statusPillW;
  const statusPillY = clientBoxY + 11;

  doc.roundedRect(statusPillX, statusPillY, statusPillW, statusPillH, 7.5)
    .fillColor(statusColors.bg).strokeColor(statusColors.border).lineWidth(0.75).fillAndStroke();

  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(statusColors.text)
    .text(statusText, statusPillX, statusPillY + 3.5, { width: statusPillW, align: 'center' });

  // Client Code & Prepared By
  const acctY = statusPillY + statusPillH + 4;
  doc.fontSize(8).font('Helvetica').fillColor('#64748b')
    .text('Client Code: ', pageWidth - margin - 180, acctY, { width: 180, align: 'right', continued: true })
    .font('Helvetica-Bold').fillColor('#0f172a').text(quotation.client_code);

  doc.fontSize(8).font('Helvetica').fillColor('#64748b')
    .text(`Prepared By: ${quotation.created_by_name || 'Staff'}`, pageWidth - margin - 180, doc.y + 1, { width: 180, align: 'right' });
  const statusBottom = doc.y;

  currentY = Math.max(clientBottom, statusBottom, clientBoxY + 46) + 8;
  doc.strokeColor('#e2e8f0').lineWidth(0.75).moveTo(margin, currentY).lineTo(pageWidth - margin, currentY).stroke();
  currentY += 8;

  // Table setup
  function checkPageOverflow(neededHeight) {
    if (currentY + neededHeight > pageHeight - margin - 36) {
      doc.addPage();
      currentY = margin;
      return true;
    }
    return false;
  }

  // Exact column definitions matching printStyles.ts
  // col-sno: 34, col-service: 236, col-qty: 42, col-unit: 50, col-rate: 76, col-amount: 85.28 = 523.28
  const colSNoX = margin;
  const colSNoW = 34;
  const colServiceX = margin + 34;
  const colServiceW = 236;
  const colQtyX = margin + 270;
  const colQtyW = 42;
  const colUnitX = margin + 312;
  const colUnitW = 50;
  const colRateX = margin + 362;
  const colRateW = 76;
  const colAmountX = margin + 438;
  const colAmountW = 85.28;

  events.forEach((evt, evtIdx) => {
    checkPageOverflow(44);

    // Event Group Banner Row (matches .print-event-row & .print-event-banner in printStyles.ts)
    const bannerH = 18;
    doc.rect(margin, currentY, contentWidth, bannerH).fill('#0f172a');
    
    // Left: Event title
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#ffffff')
      .text(`EVENT ${evtIdx + 1}: ${(evt.event_type || 'Event').toUpperCase()} — ${formatDate(evt.event_date)}`, margin + 8, currentY + 4.5, { width: contentWidth - 140, lineBreak: false });

    // Right: Venue
    if (evt.venue) {
      doc.fontSize(8).font('Helvetica').fillColor('#cbd5e1')
        .text(`Venue: ${evt.venue}`, margin + contentWidth - 130, currentY + 5, { width: 122, align: 'right', lineBreak: false });
    }
    currentY += bannerH;

    // Table Header Row (matches th in printStyles.ts)
    const thH = 16;
    doc.rect(margin, currentY, contentWidth, thH).fill('#f1f5f9');
    doc.strokeColor('#cbd5e1').lineWidth(0.5).rect(margin, currentY, contentWidth, thH).stroke();

    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#0f172a');
    doc.text('S.No', colSNoX, currentY + 4, { width: colSNoW, align: 'center' });
    doc.text('Service & Deliverable', colServiceX + 4, currentY + 4, { width: colServiceW - 8 });
    doc.text('Qty', colQtyX, currentY + 4, { width: colQtyW, align: 'center' });
    doc.text('Unit', colUnitX, currentY + 4, { width: colUnitW, align: 'center' });
    doc.text('Rate', colRateX, currentY + 4, { width: colRateW - 4, align: 'right' });
    doc.text('Amount', colAmountX, currentY + 4, { width: colAmountW - 4, align: 'right' });
    currentY += thH;

    // Items
    if (evt.items && evt.items.length > 0) {
      evt.items.forEach((item, itemIdx) => {
        const hasDesc = !!item.description_snapshot;
        const rowHeight = hasDesc ? 25 : 17;
        checkPageOverflow(rowHeight);

        const rowY = currentY;
        const isAlt = itemIdx % 2 === 1;
        if (isAlt) {
          doc.rect(margin, rowY, contentWidth, rowHeight).fill('#fafafa');
        }

        // Bottom border
        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(margin, rowY + rowHeight).lineTo(pageWidth - margin, rowY + rowHeight).stroke();

        // S.No
        doc.fontSize(7.5).font('Helvetica').fillColor('#64748b')
          .text(String(itemIdx + 1), colSNoX, rowY + 4, { width: colSNoW, align: 'center' });

        // Service Name
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a')
          .text(item.service_name_snapshot, colServiceX + 4, rowY + 4, { width: colServiceW - 8, lineBreak: false });

        // Description
        if (hasDesc) {
          doc.fontSize(6.5).font('Helvetica-Oblique').fillColor('#64748b')
            .text(item.description_snapshot, colServiceX + 4, rowY + 14, { width: colServiceW - 8, lineBreak: false });
        }

        // Qty
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a')
          .text(String(item.quantity), colQtyX, rowY + 4, { width: colQtyW, align: 'center' });

        // Unit
        doc.fontSize(7.5).font('Helvetica').fillColor('#475569')
          .text(item.unit || '-', colUnitX, rowY + 4, { width: colUnitW, align: 'center' });

        // Rate
        doc.fontSize(7.5).font('Helvetica').fillColor('#334155')
          .text(formatCurrency(item.unit_price, currencySymbol), colRateX, rowY + 4, { width: colRateW - 4, align: 'right' });

        // Amount
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a')
          .text(formatCurrency(item.total, currencySymbol), colAmountX, rowY + 4, { width: colAmountW - 4, align: 'right' });

        currentY += rowHeight;
      });
    }

    currentY += 8;
  });

  // Financial Totals Box (matches .print-totals-wrapper & .print-totals-box in printStyles.ts)
  checkPageOverflow(85);
  const totalsWidth = 260;
  const totalsX = pageWidth - margin - totalsWidth;

  // Subtotal
  doc.strokeColor('#e2e8f0').lineWidth(0.75).moveTo(totalsX, currentY).lineTo(pageWidth - margin, currentY).stroke();
  currentY += 5;

  doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text('Subtotal:', totalsX, currentY);
  doc.font('Helvetica-Bold').fillColor('#0f172a').text(formatCurrency(quotation.subtotal, currencySymbol), totalsX, currentY, { align: 'right', width: totalsWidth });
  currentY += 13;

  // Discount
  if (quotation.discount_amount > 0) {
    const discLabel = `Discount ${quotation.discount_type === 'percentage' ? `(${quotation.discount_value}%)` : '(Fixed)'}:`;
    doc.fontSize(8.5).font('Helvetica').fillColor('#047857').text(discLabel, totalsX, currentY);
    doc.font('Helvetica-Bold').fillColor('#047857').text(`-${formatCurrency(quotation.discount_amount, currencySymbol)}`, totalsX, currentY, { align: 'right', width: totalsWidth });
    currentY += 13;
  }

  // Additional / Travel
  if (quotation.additional_charges > 0) {
    doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text('Additional / Travel Charges:', totalsX, currentY);
    doc.font('Helvetica-Bold').fillColor('#0f172a').text(`+${formatCurrency(quotation.additional_charges, currencySymbol)}`, totalsX, currentY, { align: 'right', width: totalsWidth });
    currentY += 13;
  }

  // Tax
  if (quotation.tax_enabled === 1) {
    doc.fontSize(8.5).font('Helvetica').fillColor('#475569').text(`GST Tax (${quotation.tax_percentage}%):`, totalsX, currentY);
    doc.font('Helvetica-Bold').fillColor('#0f172a').text(`+${formatCurrency(quotation.tax_amount, currencySymbol)}`, totalsX, currentY, { align: 'right', width: totalsWidth });
    currentY += 13;
  }

  // Grand Total (matches .print-grand-total in printStyles.ts: 2px solid #0f172a border top)
  currentY += 2;
  doc.strokeColor('#0f172a').lineWidth(2).moveTo(totalsX, currentY).lineTo(pageWidth - margin, currentY).stroke();
  currentY += 5;

  doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text('Grand Total:', totalsX, currentY);
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text(formatCurrency(quotation.grand_total, currencySymbol), totalsX, currentY - 1, { align: 'right', width: totalsWidth });
  currentY += 20;

  // Payment Schedule & Milestones (matches .print-milestones-wrapper in printStyles.ts)
  if (paymentTerms && paymentTerms.length > 0) {
    checkPageOverflow(60);
    doc.strokeColor('#e2e8f0').lineWidth(0.75).moveTo(margin, currentY).lineTo(pageWidth - margin, currentY).stroke();
    currentY += 8;

    doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b')
      .text('PAYMENT SCHEDULE & MILESTONES', margin, currentY, { characterSpacing: 0.6 });
    currentY += 11;

    const cardHeight = 38;
    const gap = 6;
    const termColWidth = (contentWidth - (gap * (paymentTerms.length - 1))) / paymentTerms.length;

    paymentTerms.forEach((term, tIdx) => {
      const colX = margin + (tIdx * (termColWidth + gap));
      const cardWidth = termColWidth;

      // Card border and background (matches .print-milestone-card in printStyles.ts)
      doc.roundedRect(colX, currentY, cardWidth, cardHeight, 4)
        .fillColor('#f8fafc').strokeColor('#cbd5e1').lineWidth(0.75).fillAndStroke();

      // Title: .print-milestone-name
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#64748b')
        .text(term.milestone.toUpperCase(), colX + 5, currentY + 4, { 
          width: cardWidth - 10,
          height: 12,
          ellipsis: true
        });

      // Amount: .print-milestone-amount
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a')
        .text(formatCurrency(term.amount, currencySymbol), colX + 5, currentY + 16, {
          width: cardWidth - 10,
          lineBreak: false
        });

      // Pct: .print-milestone-pct
      if (term.percentage) {
        doc.fontSize(6).font('Helvetica-Bold').fillColor('#0369a1')
          .text(`${term.percentage}% of total`, colX + 5, currentY + 27, {
            width: cardWidth - 10,
            lineBreak: false
          });
      }
    });

    currentY += cardHeight + 10;
  }

  // Terms and Conditions (matches .print-terms-wrapper in printStyles.ts)
  if (quotation.terms || settings.default_terms) {
    const termsText = quotation.terms || settings.default_terms;
    doc.fontSize(6.5).font('Helvetica');
    const estimatedHeight = doc.heightOfString(termsText, { width: contentWidth, lineGap: 1.4 });
    
    checkPageOverflow(estimatedHeight + 25);
    doc.strokeColor('#e2e8f0').lineWidth(0.75).moveTo(margin, currentY).lineTo(pageWidth - margin, currentY).stroke();
    currentY += 8;

    doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b')
      .text('TERMS & CONDITIONS', margin, currentY, { characterSpacing: 0.6 });
    currentY += 9;

    doc.fontSize(6.5).font('Helvetica').fillColor('#475569')
      .text(termsText, margin, currentY, { width: contentWidth, lineGap: 1.4 });
    currentY = doc.y + 12;
  }

  // Signature Block (matches .print-signatures-grid in printStyles.ts)
  checkPageOverflow(50);
  doc.strokeColor('#e2e8f0').lineWidth(0.75).moveTo(margin, currentY).lineTo(pageWidth - margin, currentY).stroke();
  currentY += 14;

  const sigColWidth = (contentWidth - 36) / 2;
  const leftSigX = margin + 15;
  const rightSigX = margin + sigColWidth + 36 + 15;
  const sigLineW = sigColWidth - 30;

  // Helper labels above signature lines
  doc.fontSize(7.5).font('Helvetica-Oblique').fillColor('#94a3b8')
    .text('Client Acceptance Signature', leftSigX, currentY, { width: sigLineW, align: 'center' });

  doc.fontSize(7.5).font('Helvetica-Oblique').fillColor('#94a3b8')
    .text(`For ${settings.studio_name || 'Studio'}`, rightSigX, currentY, { width: sigLineW, align: 'center' });

  currentY += 26;

  // Signature Lines
  doc.strokeColor('#94a3b8').lineWidth(0.75).moveTo(leftSigX, currentY).lineTo(leftSigX + sigLineW, currentY).stroke();
  doc.strokeColor('#94a3b8').lineWidth(0.75).moveTo(rightSigX, currentY).lineTo(rightSigX + sigLineW, currentY).stroke();

  // Bottom text below lines
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#334155')
    .text('Client Signature & Date', leftSigX, currentY + 4, { width: sigLineW, align: 'center' });

  doc.fontSize(8).font('Helvetica-Bold').fillColor('#334155')
    .text('Authorized Signatory', rightSigX, currentY + 4, { width: sigLineW, align: 'center' });

  doc.end();
}

module.exports = {
  generateQuotationPdf
};
