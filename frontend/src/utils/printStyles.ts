export const getQuotationPrintStyles = (): string => `
  @page {
    size: A4 portrait;
    margin: 10mm 12mm 10mm 12mm;
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: #ffffff !important;
    color: #0f172a !important;
    margin: 0 !important;
    padding: 0 !important;
    font-size: 10.5px;
    line-height: 1.35;
  }

  .quotation-print-container {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    color: #0f172a !important;
    box-shadow: none !important;
    border: none !important;
  }

  /* Header Letterhead */
  .print-header {
    display: flex !important;
    flex-direction: row !important;
    justify-content: space-between !important;
    align-items: flex-start !important;
    gap: 16px !important;
    padding-bottom: 12px !important;
    border-bottom: 2px solid #0f172a !important;
  }

  .print-studio-brand {
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    gap: 14px !important;
    flex: 1 1 auto !important;
  }

  .print-logo {
    width: 64px !important;
    height: 64px !important;
    min-width: 64px !important;
    max-width: 64px !important;
    min-height: 64px !important;
    max-height: 64px !important;
    object-fit: cover !important;
    border-radius: 10px !important;
    border: 1px solid #cbd5e1 !important;
    flex-shrink: 0 !important;
  }

  .print-studio-info {
    flex: 1 1 auto !important;
  }

  .print-studio-name {
    font-size: 19px !important;
    font-weight: 900 !important;
    text-transform: uppercase !important;
    letter-spacing: -0.01em !important;
    color: #0f172a !important;
    margin: 0 0 2px 0 !important;
    line-height: 1.15 !important;
  }

  .print-tagline {
    font-size: 10px !important;
    font-weight: 600 !important;
    color: #475569 !important;
    margin: 0 0 3px 0 !important;
    letter-spacing: 0.02em !important;
  }

  .print-studio-contact {
    font-size: 9px !important;
    color: #64748b !important;
    line-height: 1.35 !important;
  }

  .print-quote-meta {
    text-align: right !important;
    flex-shrink: 0 !important;
  }

  .print-quote-badge {
    display: inline-block !important;
    background: #0f172a !important;
    color: #ffffff !important;
    font-weight: 800 !important;
    font-size: 11px !important;
    letter-spacing: 0.12em !important;
    padding: 4px 12px !important;
    border-radius: 6px !important;
    text-transform: uppercase !important;
  }

  .print-quote-info {
    margin-top: 6px !important;
    font-size: 10px !important;
    color: #334155 !important;
    line-height: 1.45 !important;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
  }

  /* Client & Quotation Meta Box */
  .print-meta-grid {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 16px !important;
    padding: 10px 0 !important;
    border-bottom: 1px solid #e2e8f0 !important;
  }

  .print-client-box {
    display: flex !important;
    flex-direction: column !important;
    gap: 2px !important;
    text-align: left !important;
  }

  .print-account-box {
    display: flex !important;
    flex-direction: column !important;
    gap: 2px !important;
    text-align: right !important;
    align-items: flex-end !important;
  }

  .print-section-label {
    font-size: 8.5px !important;
    font-weight: 800 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.08em !important;
    color: #94a3b8 !important;
    margin-bottom: 2px !important;
  }

  .print-client-name {
    font-size: 13.5px !important;
    font-weight: 800 !important;
    color: #0f172a !important;
    margin-bottom: 2px !important;
  }

  .print-meta-text {
    font-size: 9.5px !important;
    color: #475569 !important;
    line-height: 1.35 !important;
  }

  .print-status-pill {
    display: inline-block !important;
    padding: 2px 8px !important;
    border-radius: 9999px !important;
    font-size: 9.5px !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
    border: 1px solid #cbd5e1 !important;
    background: #f8fafc !important;
    color: #0f172a !important;
  }

  /* Multi-Event Services Table */
  .print-table-container {
    padding: 6px 0 !important;
  }

  table, .print-table {
    width: 100% !important;
    border-collapse: collapse !important;
    margin: 6px 0 !important;
    font-size: 9.5px !important;
    table-layout: fixed !important;
  }

  th, td {
    border: 1px solid #cbd5e1 !important;
    padding: 5px 6px !important;
    font-size: 9.5px !important;
    vertical-align: top !important;
  }

  th {
    background-color: #f1f5f9 !important;
    color: #0f172a !important;
    font-weight: 800 !important;
    text-transform: uppercase !important;
    font-size: 9px !important;
    letter-spacing: 0.04em !important;
  }

  .col-sno { width: 34px !important; text-align: center !important; }
  .col-service { width: auto !important; text-align: left !important; }
  .col-qty { width: 42px !important; text-align: center !important; }
  .col-unit { width: 50px !important; text-align: center !important; }
  .col-rate { width: 78px !important; text-align: right !important; }
  .col-amount { width: 85px !important; text-align: right !important; }

  /* Event banner */
  .print-event-row {
    background-color: #0f172a !important;
    color: #ffffff !important;
    font-weight: 800 !important;
    page-break-after: avoid !important;
    break-after: avoid !important;
  }

  .print-event-row td {
    background-color: #0f172a !important;
    color: #ffffff !important;
    padding: 5px 8px !important;
    border-color: #0f172a !important;
  }

  .print-event-banner {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    width: 100% !important;
    color: #ffffff !important;
    font-size: 10px !important;
  }

  .print-event-title {
    color: #ffffff !important;
    font-weight: 800 !important;
    letter-spacing: 0.04em !important;
  }

  .print-event-venue {
    color: #cbd5e1 !important;
    font-weight: normal !important;
    font-size: 9.5px !important;
  }

  /* Service Item formatting */
  .print-item-name {
    font-weight: 700 !important;
    color: #0f172a !important;
  }

  .print-item-desc {
    font-size: 8.5px !important;
    color: #64748b !important;
    font-style: italic !important;
    margin-top: 1px !important;
    line-height: 1.25 !important;
  }

  /* Totals Box */
  .print-totals-wrapper {
    display: flex !important;
    justify-content: flex-end !important;
    padding: 6px 0 10px 0 !important;
    border-bottom: 1px solid #e2e8f0 !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .print-totals-box {
    width: 260px !important;
    font-size: 9.5px !important;
    line-height: 1.4 !important;
  }

  .print-total-row {
    display: flex !important;
    justify-content: space-between !important;
    padding: 2px 0 !important;
    color: #334155 !important;
    border-bottom: 1px solid #f1f5f9 !important;
  }

  .print-total-discount {
    color: #047857 !important;
  }

  .print-grand-total {
    display: flex !important;
    justify-content: space-between !important;
    border-top: 2px solid #0f172a !important;
    padding: 5px 0 2px 0 !important;
    margin-top: 3px !important;
    font-size: 13px !important;
    font-weight: 900 !important;
    color: #0f172a !important;
  }

  /* Payment Milestones */
  .print-milestones-wrapper {
    padding: 8px 0 !important;
    border-bottom: 1px solid #e2e8f0 !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .print-milestones-title {
    font-size: 8.5px !important;
    font-weight: 800 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.06em !important;
    color: #64748b !important;
    margin-bottom: 5px !important;
  }

  .print-milestones-grid {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 6px !important;
  }

  .print-milestone-card {
    flex: 1 1 95px !important;
    border: 1px solid #cbd5e1 !important;
    background: #f8fafc !important;
    border-radius: 6px !important;
    padding: 4px 6px !important;
  }

  .print-milestone-name {
    font-size: 8px !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
    color: #64748b !important;
  }

  .print-milestone-amount {
    font-size: 10.5px !important;
    font-weight: 800 !important;
    color: #0f172a !important;
    margin-top: 1px !important;
  }

  .print-milestone-pct {
    font-size: 8px !important;
    color: #0369a1 !important;
    font-weight: 600 !important;
  }

  /* Terms & Conditions */
  .print-terms-wrapper {
    padding: 8px 0 !important;
    border-bottom: 1px solid #e2e8f0 !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .print-terms-title {
    font-size: 8.5px !important;
    font-weight: 800 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.06em !important;
    color: #64748b !important;
    margin-bottom: 3px !important;
  }

  .print-terms-content {
    font-size: 8px !important;
    line-height: 1.35 !important;
    color: #475569 !important;
    white-space: pre-line !important;
  }

  /* Signatures */
  .print-signatures-grid {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 36px !important;
    padding-top: 14px !important;
    text-align: center !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .print-sig-col {
    display: flex !important;
    flex-direction: column !important;
    justify-content: flex-end !important;
  }

  .print-sig-label {
    font-size: 8.5px !important;
    font-style: italic !important;
    color: #94a3b8 !important;
    margin-bottom: 30px !important;
  }

  .print-sig-line {
    border-top: 1px solid #94a3b8 !important;
    padding-top: 4px !important;
    font-size: 9.5px !important;
    font-weight: 700 !important;
    color: #334155 !important;
  }

  /* Helper utilities */
  .text-right { text-align: right !important; }
  .text-center { text-align: center !important; }
  .font-bold { font-weight: bold !important; }
  .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important; }

  /* Page break rules */
  tr { page-break-inside: avoid !important; break-inside: avoid !important; }
  thead { display: table-header-group !important; }
  .no-print { display: none !important; }

  @media print {
    body { padding: 0 !important; }
    .no-print { display: none !important; }
  }
`;
