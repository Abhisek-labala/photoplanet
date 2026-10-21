import React, { useState, useEffect } from 'react';
import type { Quotation, QuotationEvent, PaymentTerm, Settings } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../../utils/formatters';
import {
  Printer,
  Share2,
  Copy,
  ArrowLeft,
  Edit3,
  ExternalLink,
  Download,
  Loader2,
  FileCheck,
  MessageCircle,
  Check,
  X,
  Send,
  CalendarCheck
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { getQuotationPrintStyles } from '../../utils/printStyles';

interface QuotationViewProps {
  quotationId: number;
  onBack: () => void;
  onEdit: (id: number) => void;
  onDuplicateSuccess?: (newId: number) => void;
}

export const QuotationView: React.FC<QuotationViewProps> = ({
  quotationId,
  onBack,
  onEdit,
  onDuplicateSuccess
}) => {
  const [data, setData] = useState<{
    quotation: Quotation;
    events: QuotationEvent[];
    paymentTerms: PaymentTerm[];
    statusHistory: any[];
    settings: Settings;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedDetails, setCopiedDetails] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchQuotation = async () => {
    setLoading(true);
    try {
      const res = await api.getQuotation(quotationId);
      setData(res);
    } catch (err) {
      console.error('Error fetching quotation:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotation();
  }, [quotationId]);

  const handleDownloadPdf = async () => {
    if (!data) return;

    setIsGeneratingPdf(true);
    const safeClientName = (data.quotation.client_name || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${data.quotation.quotation_number}_${safeClientName}.pdf`;

    try {
      // 1. Primary: High-resolution vector PDF generated from server
      const pdfBlob = await api.getQuotationPdfBlob(quotationId);
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // Mobile share sheet (WhatsApp, Mail, Save to Files, AirDrop)
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            title: `Quotation ${data.quotation.quotation_number}`,
            text: `Quotation for ${data.quotation.client_name} - ${data.settings?.studio_name || 'Studio'}`,
            files: [pdfFile]
          });
          setIsGeneratingPdf(false);
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            setIsGeneratingPdf(false);
            return;
          }
        }
      }

      // Direct device file download
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
      setIsGeneratingPdf(false);
      return;
    } catch (backendErr) {
      console.warn('Server PDF generation error, trying client-side fallback:', backendErr);
    }

    // 2. Client-side fallback via jsPDF + html2canvas
    try {
      const printDoc = document.getElementById('quotation-a4-document');
      if (!printDoc) throw new Error('Document element not found');

      window.scrollTo(0, 0);

      const canvas = await html2canvas(printDoc, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1024,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('quotation-a4-document');
          if (clonedElement) {
            clonedElement.style.width = '1024px';
            clonedElement.style.maxWidth = '1024px';
            clonedElement.style.padding = '40px';
            clonedElement.style.borderRadius = '0px';
            clonedElement.style.boxShadow = 'none';
          }
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft > 5) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      pdf.save(fileName);
    } catch (err: any) {
      console.error('All PDF generation methods failed:', err);
      handleOpenPrintTab();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    const printElement = document.getElementById('quotation-a4-document');
    if (!printElement) {
      window.print();
      return;
    }

    // Try iframe print first (works cleanly inside standalone WebViews / PWAs)
    try {
      const existingFrame = document.getElementById('pwa-print-frame');
      if (existingFrame) existingFrame.remove();

      const printFrame = document.createElement('iframe');
      printFrame.id = 'pwa-print-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>${data?.quotation.quotation_number || 'Quotation'} - ${data?.settings?.studio_name || 'Studio'}</title>
              <style>
                ${getQuotationPrintStyles()}
              </style>
            </head>
            <body>
              <div class="quotation-print-container">
                ${printElement.innerHTML}
              </div>
            </body>
          </html>
        `);
        frameDoc.close();

        const triggerPrint = () => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
          } catch {
            window.print();
          }
        };

        // Ensure all images are fully loaded before showing print dialog
        const images = Array.from(frameDoc.images);
        if (images.length === 0) {
          setTimeout(triggerPrint, 150);
        } else {
          let loaded = 0;
          let printed = false;
          const onDone = () => {
            if (!printed) {
              printed = true;
              setTimeout(triggerPrint, 150);
            }
          };

          images.forEach((img) => {
            if (img.complete) {
              loaded++;
            } else {
              img.onload = () => {
                loaded++;
                if (loaded === images.length) onDone();
              };
              img.onerror = () => {
                loaded++;
                if (loaded === images.length) onDone();
              };
            }
          });

          if (loaded === images.length) {
            onDone();
          } else {
            setTimeout(onDone, 1200); // Safety fallback
          }
        }
        return;
      }
    } catch {
      // Fallback
    }

    window.print();
  };

  const handleOpenPrintTab = () => {
    const printElement = document.getElementById('quotation-a4-document');
    if (!printElement) return;

    const newWin = window.open('', '_blank');
    if (newWin) {
      newWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${data?.quotation.quotation_number || 'Quotation'} - ${data?.settings?.studio_name || 'Studio'}</title>
            <style>
              ${getQuotationPrintStyles()}
              body { 
                background: #f1f5f9 !important; 
                padding: 24px !important; 
              }
              .invoice-card {
                max-width: 820px;
                margin: 0 auto;
                background: #ffffff;
                padding: 36px 40px;
                border-radius: 16px;
                box-shadow: 0 4px 24px rgba(0,0,0,0.08);
              }
              .print-bar {
                max-width: 820px;
                margin: 0 auto 16px auto;
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              .btn-print {
                padding: 10px 24px;
                background: #0284c7;
                color: #fff;
                font-weight: bold;
                border: none;
                border-radius: 12px;
                cursor: pointer;
                font-size: 14px;
                box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
              }
              .btn-print:hover {
                background: #0369a1;
              }
              @media print {
                body { background: #fff !important; padding: 0 !important; }
                .invoice-card { padding: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
                .print-bar { display: none !important; }
              }
            </style>
          </head>
          <body>
            <div class="print-bar no-print">
              <div>
                <strong>${data?.settings?.studio_name || 'Studio'}</strong> &bull; ${data?.quotation.quotation_number}
              </div>
              <button class="btn-print" onclick="window.print()">Print / Save PDF</button>
            </div>
            <div class="invoice-card quotation-print-container">
              ${printElement.innerHTML}
            </div>
          </body>
        </html>
      `);
      newWin.document.close();
    }
  };

  const handleDuplicate = async () => {
    if (confirm('Create a new duplicate of this quotation?')) {
      try {
        const res = await api.duplicateQuotation(quotationId);
        alert(res.message);
        if (onDuplicateSuccess) {
          onDuplicateSuccess(res.quotationId);
        } else {
          onEdit(res.quotationId);
        }
      } catch (err: any) {
        alert(err.message || 'Duplicate failed');
      }
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      await api.updateQuotationStatus(quotationId, newStatus);
      if (newStatus === 'Converted to Booking') {
        alert('Quotation converted to booking! Event details have been scheduled in Shoots & Events.');
      }
      await fetchQuotation();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleConvertToBooking = async () => {
    if (!data) return;
    if (confirm(`Convert Quotation #${data.quotation.quotation_number} to Booking?\n\nThis will confirm the booking and automatically schedule the event details into Shoots & Events.`)) {
      setUpdatingStatus(true);
      try {
        const res = await api.convertToBooking(quotationId);
        alert(res.message || 'Quotation converted to booking! Event details scheduled in Shoots & Events.');
        await fetchQuotation();
      } catch (err: any) {
        alert(err.message || 'Failed to convert quotation to booking');
      } finally {
        setUpdatingStatus(false);
      }
    }
  };

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fallback below
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch {
      return false;
    }
  };

  const getQuotationSummaryText = () => {
    if (!data) return '';
    const q = data.quotation;
    const s = data.settings;
    const eventsList = data.events.map((e, i) => `• Event ${i + 1}: ${e.event_type} on ${formatDate(e.event_date)}${e.venue ? ` at ${e.venue}` : ''}`).join('\n');

    return `*${(s?.studio_name || 'STUDIO PHOTOGRAPHY').toUpperCase()} - QUOTATION*\n\n` +
      `Dear ${q.client_name},\n` +
      `Here is the quotation for your upcoming photography & cinematography coverage:\n\n` +
      `📄 Quote No: *${q.quotation_number}*\n` +
      `📅 Date: ${formatDate(q.quotation_date)}\n\n` +
      `*Events Covered:*\n${eventsList}\n\n` +
      `💰 *Total Amount:* *${formatCurrency(q.grand_total, s?.currency_symbol || '₹')}*\n\n` +
      (s?.phone ? `📞 Contact: ${s.phone}\n` : '') +
      `Thank you!`;
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleNativeShare = async () => {
    if (!data) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Quotation ${data.quotation.quotation_number} - ${data.settings?.studio_name || 'Studio'}`,
          text: getQuotationSummaryText(),
          url: window.location.href
        });
      } else {
        await handleCopySummary();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        await handleCopySummary();
      }
    }
  };

  const handleWhatsAppClient = () => {
    if (!data) return;
    const q = data.quotation;
    const text = encodeURIComponent(getQuotationSummaryText());
    const rawMobile = (q.client_mobile || '').replace(/\D/g, '');
    const mobile = rawMobile.length === 10 ? `91${rawMobile}` : rawMobile;
    const url = mobile
      ? `https://api.whatsapp.com/send?phone=${mobile}&text=${text}`
      : `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, '_blank');
  };

  const handleWhatsAppGeneral = () => {
    const text = encodeURIComponent(getQuotationSummaryText());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleCopySummary = async () => {
    const success = await copyToClipboard(getQuotationSummaryText());
    if (success) {
      setCopiedDetails(true);
      setTimeout(() => setCopiedDetails(false), 2500);
    }
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(window.location.href);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (loading || !data) {
    return (
      <div className="py-24 text-center text-slate-400 text-sm">
        Loading quotation details...
      </div>
    );
  }

  const { quotation, events, paymentTerms, settings } = data;
  const currencySymbol = settings?.currency_symbol || '₹';

  return (
    <div className="space-y-6 pb-24 lg:pb-12">

      {/* Action Toolbar (Hidden during print) */}
      <div className="no-print bg-slate-900 border border-slate-800 rounded-3xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status changer */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-2xl border border-slate-800 min-h-[44px]">
            <span className="text-xs text-slate-400 font-medium">Status:</span>
            <span
              className={`w-2 h-2 rounded-full inline-block shrink-0 ${
                quotation.status === 'Accepted'
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                  : quotation.status === 'Sent'
                  ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]'
                  : quotation.status === 'Converted to Booking'
                  ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]'
                  : quotation.status === 'Rejected'
                  ? 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]'
                  : quotation.status === 'Cancelled'
                  ? 'bg-slate-500'
                  : 'bg-slate-400'
              }`}
            />
            <select
              value={quotation.status}
              disabled={updatingStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer [&>option]:bg-slate-900 [&>option]:text-slate-100 pr-1"
            >
              <option value="Draft" className="bg-slate-900 text-slate-100">Draft</option>
              <option value="Sent" className="bg-slate-900 text-slate-100">Sent</option>
              <option value="Accepted" className="bg-slate-900 text-slate-100">Accepted</option>
              <option value="Converted to Booking" className="bg-slate-900 text-slate-100">Converted to Booking</option>
              <option value="Rejected" className="bg-slate-900 text-slate-100">Rejected</option>
              <option value="Cancelled" className="bg-slate-900 text-slate-100">Cancelled</option>
            </select>
            {updatingStatus && <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0" />}
          </div>

          {quotation.status !== 'Converted to Booking' && (
            <button
              onClick={handleConvertToBooking}
              disabled={updatingStatus}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer min-h-[44px] disabled:opacity-50"
              title="Convert this quotation to booking and add events to Shoots & Events"
            >
              <CalendarCheck className="w-4 h-4 text-white" />
              <span>Convert to Booking</span>
            </button>
          )}

          <button
            onClick={() => onEdit(quotation.id)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer min-h-[44px]"
          >
            <Edit3 className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Edit</span>
          </button>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer min-h-[44px]"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Share</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-sky-500/25 transition-all cursor-pointer min-h-[44px] disabled:opacity-50"
            title="Download crisp, professional A4 PDF"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer min-h-[44px]"
            title="Direct Print Document"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Print</span>
          </button>

          <button
            onClick={handleOpenPrintTab}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer min-h-[44px]"
            title="Open Clean Print View in New Tab"
          >
            <ExternalLink className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">Invoice Tab</span>
          </button>
        </div>
      </div>

      {/* A4 PRINT & PREVIEW QUOTATION CONTAINER */}
      <div id="quotation-a4-document" className="quotation-print-container bg-white text-slate-900 rounded-3xl p-4 sm:p-8 md:p-10 shadow-2xl max-w-4xl mx-auto border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none">

        {/* Studio Letterhead Header */}
        <div className="print-header flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-6 pb-5 border-b-2 border-slate-900">
          <div className="print-studio-brand flex items-center gap-3 sm:gap-4">
            <img
              src={settings?.logo || '/logo.jpg'}
              alt={settings?.studio_name || 'Studio Logo'}
              className="print-logo w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover ring-1 ring-slate-900 shrink-0"
              style={{
                width: '64px',
                height: '64px',
                minWidth: '64px',
                minHeight: '64px',
                maxWidth: '64px',
                maxHeight: '64px',
                objectFit: 'cover'
              }}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="print-studio-info">
              <h1 className="print-studio-name text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase m-0 leading-tight">
                {settings?.studio_name || 'STUDIO PHOTOGRAPHY'}
              </h1>
              <p className="print-tagline text-xs sm:text-sm font-bold text-slate-700 mt-0.5 tracking-wider">
                {settings?.tagline || ''}
              </p>
              <div className="print-studio-contact text-[11px] text-slate-600 mt-1 leading-relaxed">
                {settings?.address && <div>{settings.address}{settings.city ? `, ${settings.city}` : ''}{settings.pincode ? ` - ${settings.pincode}` : ''}</div>}
                {(settings?.phone || settings?.email) && (
                  <div>
                    {settings.phone && <span>Ph: {settings.phone} </span>}
                    {settings.email && <span>• Email: {settings.email}</span>}
                  </div>
                )}
                {settings?.gst_number && (
                  <div className="font-bold text-slate-800">GSTIN: {settings.gst_number}</div>
                )}
              </div>
            </div>
          </div>

          <div className="print-quote-meta text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <div className="print-quote-badge inline-block px-3 py-1 bg-slate-950 text-white font-mono font-bold text-xs sm:text-sm tracking-widest rounded-lg uppercase">
              QUOTATION
            </div>
            <div className="print-quote-info mt-2 text-xs text-slate-700 space-y-0.5 font-mono">
              <div><strong>Quote No:</strong> {quotation.quotation_number}</div>
              <div><strong>Date:</strong> {formatDate(quotation.quotation_date)}</div>
            </div>
          </div>
        </div>

        {/* Client & Quotation Meta Box */}
        <div className="print-meta-grid grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 sm:py-5 border-b border-slate-200">
          <div className="print-client-box space-y-1">
            <div className="print-section-label text-[10px] font-bold uppercase tracking-wider text-slate-400">
              QUOTATION ISSUED TO:
            </div>
            <div className="print-client-name text-base font-bold text-slate-950">
              {quotation.client_name}
            </div>
            <div className="print-meta-text text-xs text-slate-700 space-y-0.5">
              <div><strong>Mobile:</strong> {quotation.client_mobile}</div>
              {quotation.client_email && <div><strong>Email:</strong> {quotation.client_email}</div>}
              {quotation.client_address && (
                <div><strong>Address:</strong> {quotation.client_address}{quotation.client_city ? `, ${quotation.client_city}` : ''}</div>
              )}
            </div>
          </div>

          <div className="print-account-box space-y-1 sm:text-right">
            <div className="print-section-label text-[10px] font-bold uppercase tracking-wider text-slate-400">
              STATUS & ACCOUNT:
            </div>
            <div className="inline-block">
              <span className={`print-status-pill px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${getStatusBadgeClass(quotation.status)}`}>
                {quotation.status}
              </span>
            </div>
            <div className="print-meta-text text-xs text-slate-600 mt-1">
              <div>Client Code: <span className="font-mono font-bold">{quotation.client_code}</span></div>
              <div>Prepared By: {quotation.created_by_name || 'Staff'}</div>
            </div>
          </div>
        </div>

        {/* MULTI-EVENT SERVICES TABLE (Horizontally scrollable on mobile screen, pristine on print) */}
        <div className="print-table-container py-4 sm:py-5 overflow-x-auto">
          <table className="print-table w-full text-left text-xs border-collapse min-w-[500px] sm:min-w-0">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-900 font-bold uppercase tracking-wider">
                <th className="col-sno py-2.5 px-3 w-12 text-center">S.No</th>
                <th className="col-service py-2.5 px-3">Service & Deliverable</th>
                <th className="col-qty py-2.5 px-3 text-center w-16">Qty</th>
                <th className="col-unit py-2.5 px-3 text-center w-20">Unit</th>
                <th className="col-rate py-2.5 px-3 text-right w-24">Rate</th>
                <th className="col-amount py-2.5 px-3 text-right w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {events.map((evt, evtIndex) => (
                <React.Fragment key={evt.id || evtIndex}>
                  {/* Event Group Header Row */}
                  <tr className="print-event-row bg-slate-900 text-white font-bold">
                    <td colSpan={6} className="py-2 px-3 text-xs tracking-wide">
                      <div className="print-event-banner flex flex-wrap items-center justify-between gap-2">
                        <span className="print-event-title">
                          EVENT {evtIndex + 1}: {evt.event_type.toUpperCase()} — {formatDate(evt.event_date)}
                        </span>
                        {evt.venue && (
                          <span className="print-event-venue text-[11px] font-normal text-slate-300">
                            Venue: {evt.venue}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Service Items for this Event */}
                  {evt.items && evt.items.length > 0 ? (
                    evt.items.map((item, itemIdx) => (
                      <tr key={item.id || itemIdx} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                          {itemIdx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="print-item-name font-bold text-slate-900">
                            {item.service_name_snapshot}
                          </div>
                          {item.description_snapshot && (
                            <div className="print-item-desc text-[11px] text-slate-600 italic mt-0.5">
                              {item.description_snapshot}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold font-mono">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-700">
                          {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {formatCurrency(item.unit_price, currencySymbol)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold font-mono text-slate-950">
                          {formatCurrency(item.total, currencySymbol)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-3 text-center text-slate-400 italic">
                        No service items added for this event.
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="print-totals-wrapper flex flex-col sm:flex-row justify-end pt-3 pb-6 border-b border-slate-200">
          <div className="print-totals-box w-full sm:w-80 space-y-2 text-xs">

            <div className="print-total-row flex justify-between py-1 border-b border-slate-100 text-slate-700">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold">{formatCurrency(quotation.subtotal, currencySymbol)}</span>
            </div>

            {quotation.discount_amount > 0 && (
              <div className="print-total-row print-total-discount flex justify-between py-1 border-b border-slate-100 text-emerald-700">
                <span>
                  Discount {quotation.discount_type === 'percentage' ? `(${quotation.discount_value}%)` : '(Fixed)'}:
                </span>
                <span className="font-mono font-semibold">
                  -{formatCurrency(quotation.discount_amount, currencySymbol)}
                </span>
              </div>
            )}

            {quotation.additional_charges > 0 && (
              <div className="print-total-row flex justify-between py-1 border-b border-slate-100 text-slate-700">
                <span>Additional / Travel Charges:</span>
                <span className="font-mono font-semibold">
                  +{formatCurrency(quotation.additional_charges, currencySymbol)}
                </span>
              </div>
            )}

            {quotation.tax_enabled === 1 && (
              <div className="print-total-row flex justify-between py-1 border-b border-slate-100 text-slate-700">
                <span>GST Tax ({quotation.tax_percentage}%):</span>
                <span className="font-mono font-semibold">
                  +{formatCurrency(quotation.tax_amount, currencySymbol)}
                </span>
              </div>
            )}

            <div className="print-grand-total flex justify-between py-2 text-sm sm:text-base font-black text-slate-950 border-t-2 border-slate-950">
              <span>Grand Total:</span>
              <span className="font-mono text-base sm:text-lg">{formatCurrency(quotation.grand_total, currencySymbol)}</span>
            </div>

          </div>
        </div>

        {/* Payment Milestone Schedule */}
        {paymentTerms && paymentTerms.length > 0 && (
          <div className="print-milestones-wrapper py-4 sm:py-5 border-b border-slate-200">
            <h4 className="print-milestones-title text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
              Payment Schedule & Milestones
            </h4>
            <div className="print-milestones-grid grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              {paymentTerms.map((pt, idx) => (
                <div key={pt.id || idx} className="print-milestone-card p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="print-milestone-name text-[10px] text-slate-500 font-semibold uppercase truncate">{pt.milestone}</div>
                  <div className="print-milestone-amount text-xs font-bold text-slate-900 font-mono mt-0.5">
                    {formatCurrency(pt.amount, currencySymbol)}
                  </div>
                  <div className="print-milestone-pct text-[10px] text-sky-700 font-medium">
                    {pt.percentage}% of total
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Terms and Conditions */}
        <div className="print-terms-wrapper py-4 sm:py-5 border-b border-slate-200 text-[11px] text-slate-700 leading-relaxed">
          <h4 className="print-terms-title text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
            Terms & Conditions
          </h4>
          <div className="print-terms-content whitespace-pre-line space-y-1">
            {quotation.terms || settings?.default_terms}
          </div>
        </div>

        {/* Signature & Acceptance Block */}
        <div className="print-signatures-grid pt-6 sm:pt-8 grid grid-cols-2 gap-4 sm:gap-8 text-center text-xs">
          <div className="print-sig-col space-y-8 sm:space-y-12">
            <div className="print-sig-label text-slate-400 italic text-[11px]">Client Acceptance Signature</div>
            <div className="print-sig-line border-t border-slate-400 pt-1 font-semibold text-slate-800 text-[11px] sm:text-xs">
              Client Signature & Date
            </div>
          </div>

          <div className="print-sig-col space-y-8 sm:space-y-12">
            <div className="print-sig-label text-slate-400 italic text-[11px]">For {settings?.studio_name || 'Studio'}</div>
            <div className="print-sig-line border-t border-slate-400 pt-1 font-semibold text-slate-800 text-[11px] sm:text-xs">
              Authorized Signatory
            </div>
          </div>
        </div>

      </div>

      {/* Sleek Mobile-Friendly Share Modal */}
      {showShareModal && data && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xs p-0 sm:p-4 no-print">
          <div className="bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">

            <button
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
              <div className="p-3 rounded-2xl bg-emerald-950/70 border border-emerald-800/50 text-emerald-400">
                <Share2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">Share Quotation</h3>
                <p className="text-xs text-slate-400 font-mono">{data.quotation.quotation_number} &bull; {data.quotation.client_name}</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* WhatsApp direct to Client */}
              {data.quotation.client_mobile && (
                <button
                  onClick={handleWhatsAppClient}
                  className="w-full p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-between shadow-lg shadow-emerald-600/25 transition-all cursor-pointer min-h-[48px]"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="w-5 h-5" />
                    <span>Send via WhatsApp to Client</span>
                  </div>
                  <span className="font-mono text-[11px] bg-emerald-700/60 px-2 py-0.5 rounded-md">
                    {data.quotation.client_mobile}
                  </span>
                </button>
              )}

              {/* WhatsApp to Anyone */}
              <button
                onClick={handleWhatsAppGeneral}
                className="w-full p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs flex items-center gap-2.5 transition-colors cursor-pointer min-h-[48px]"
              >
                <MessageCircle className="w-5 h-5 text-emerald-400" />
                <span>Share via WhatsApp (Choose Contact)</span>
              </button>

              {/* Native Share Sheet (if supported) */}
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={handleNativeShare}
                  className="w-full p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs flex items-center gap-2.5 transition-colors cursor-pointer min-h-[48px]"
                >
                  <Send className="w-5 h-5 text-sky-400" />
                  <span>Device System Share Sheet</span>
                </button>
              )}

              {/* Copy Full Quotation Text */}
              <button
                onClick={handleCopySummary}
                className="w-full p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs flex items-center justify-between transition-colors cursor-pointer min-h-[48px]"
              >
                <div className="flex items-center gap-2.5">
                  {copiedDetails ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-amber-400" />}
                  <span>{copiedDetails ? 'Quotation Summary Copied!' : 'Copy Formatted Quotation Text'}</span>
                </div>
                {copiedDetails && <span className="text-[11px] text-emerald-400 font-bold">Ready to Paste</span>}
              </button>

              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                className="w-full p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs flex items-center justify-between transition-colors cursor-pointer min-h-[48px]"
              >
                <div className="flex items-center gap-2.5">
                  {copiedLink ? <Check className="w-5 h-5 text-emerald-400" /> : <ExternalLink className="w-5 h-5 text-purple-400" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Quotation Link'}</span>
                </div>
                {copiedLink && <span className="text-[11px] text-emerald-400 font-bold">Copied</span>}
              </button>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowShareModal(false)}
                className="w-full py-3 rounded-2xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 transition-colors cursor-pointer min-h-[44px]"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
