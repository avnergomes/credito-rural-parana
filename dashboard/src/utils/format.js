/**
 * Format a number with thousand separators (Brazilian format)
 * @param {number} value - The number to format
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted number string
 */
export function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) return '-';

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a value as Brazilian Real currency
 * @param {number} value - The value to format
 * @param {boolean} compact - Use compact notation for large values
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, compact = false) {
  if (value === null || value === undefined || isNaN(value)) return '-';

  if (compact) {
    if (Math.abs(value) >= 1e9) {
      return `R$ ${formatNumber(value / 1e9, 2)} bi`;
    }
    if (Math.abs(value) >= 1e6) {
      return `R$ ${formatNumber(value / 1e6, 2)} mi`;
    }
    if (Math.abs(value) >= 1e3) {
      return `R$ ${formatNumber(value / 1e3, 1)} mil`;
    }
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a value as percentage
 * @param {number} value - The value to format (0-100 scale)
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '-';

  return `${formatNumber(value, decimals)}%`;
}

/**
 * Format area in hectares
 * @param {number} value - The value in hectares
 * @param {boolean} compact - Use compact notation
 * @returns {string} Formatted area string
 */
export function formatArea(value, compact = false) {
  if (value === null || value === undefined || isNaN(value)) return '-';

  if (compact && Math.abs(value) >= 1e6) {
    return `${formatNumber(value / 1e6, 2)} mi ha`;
  }
  if (compact && Math.abs(value) >= 1e3) {
    return `${formatNumber(value / 1e3, 1)} mil ha`;
  }

  return `${formatNumber(value, 0)} ha`;
}

/**
 * Format a date to Brazilian format
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!date) return '-';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Format month/year
 * @param {number} ano - Year
 * @param {number} mes - Month (1-12)
 * @returns {string} Formatted month/year string
 */
export function formatMonthYear(ano, mes) {
  const months = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  if (!mes || mes < 1 || mes > 12) return String(ano);
  return `${months[mes - 1]}/${ano}`;
}

/**
 * Calculate percentage change between two values
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {number} Percentage change
 */
export function calculateChange(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Abbreviate large numbers (1.2M, 3.5B, etc.)
 * @param {number} value - The number to abbreviate
 * @returns {string} Abbreviated string
 */
export function abbreviateNumber(value) {
  if (value === null || value === undefined || isNaN(value)) return '-';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1e12) return `${sign}${(absValue / 1e12).toFixed(1)}T`;
  if (absValue >= 1e9) return `${sign}${(absValue / 1e9).toFixed(1)}B`;
  if (absValue >= 1e6) return `${sign}${(absValue / 1e6).toFixed(1)}M`;
  if (absValue >= 1e3) return `${sign}${(absValue / 1e3).toFixed(1)}K`;

  return formatNumber(value);
}
