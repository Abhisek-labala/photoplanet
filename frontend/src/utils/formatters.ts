export function formatCurrency(amount: number, symbol: string = '₹'): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `${symbol}0.00`;
  }
  
  // Format as Indian numbering system
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

export function formatDate(dateStr?: string): string {
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

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Draft':
      return 'bg-slate-700 text-slate-200 border-slate-600';
    case 'Sent':
      return 'bg-blue-900/40 text-blue-300 border-blue-700/50';
    case 'Accepted':
      return 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50';
    case 'Converted to Booking':
      return 'bg-indigo-900/40 text-indigo-300 border-indigo-700/50';
    case 'Rejected':
      return 'bg-rose-900/40 text-rose-300 border-rose-700/50';
    case 'Cancelled':
      return 'bg-gray-800 text-gray-400 border-gray-700';
    case 'Confirmed':
      return 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50';
    case 'Enquiry':
      return 'bg-amber-900/40 text-amber-300 border-amber-700/50';
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700';
  }
}
