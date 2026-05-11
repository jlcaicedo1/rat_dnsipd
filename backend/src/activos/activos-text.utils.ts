const LOWERCASE_CONNECTORS = new Set([
  'a',
  'al',
  'con',
  'de',
  'del',
  'e',
  'el',
  'en',
  'la',
  'las',
  'lo',
  'los',
  'o',
  'para',
  'por',
  'sin',
  'u',
  'y',
]);

const PRESERVED_ACRONYMS = new Set([
  'API',
  'APP',
  'BCE',
  'BI',
  'CRM',
  'CVIRP',
  'DAIE',
  'DNSC',
  'DNAC',
  'DNGF',
  'DNPL',
  'DNPR',
  'DNRI',
  'DNSAC',
  'DNSIPD',
  'DNTI',
  'DSGRT',
  'DSGSIF',
  'DSP',
  'ECM',
  'EIPD',
  'ERP',
  'ETL',
  'FTP',
  'IAM',
  'IESS',
  'IP',
  'ISSPOL',
  'ISSFA',
  'JSON',
  'JTRAC',
  'MIES',
  'MTGE',
  'OTRS',
  'PAC',
  'PQSF',
  'PG',
  'PRD',
  'RP',
  'QA',
  'RAT',
  'REST',
  'SFTP',
  'SRI',
  'SSC',
  'SIEM',
  'SQL',
  'TDR',
  'TI',
  'UAT',
  'UI',
  'URL',
  'UX',
  'VPN',
  'WEB',
  'WS',
]);

export function normalizeIdentifierText(value?: unknown) {
  const text = normalizeWhitespace(value);
  return text ? text.toUpperCase() : null;
}

export function normalizeTitleText(value?: unknown) {
  const text = normalizeWhitespace(value);

  if (!text) {
    return null;
  }

  let wordIndex = 0;

  return text.replace(
    /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+/g,
    (token) => {
      const formatted = formatTitleToken(token, wordIndex === 0);
      wordIndex += 1;
      return formatted;
    },
  );
}

export function normalizeSentenceText(value?: unknown) {
  const text = normalizeWhitespace(value, true);

  if (!text) {
    return null;
  }

  let shouldCapitalize = true;

  return text.replace(
    /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+|[.!?\n]+/g,
    (token) => {
      if (/^[.!?\n]+$/.test(token)) {
        if (token.includes('\n') || /[.!?]/.test(token)) {
          shouldCapitalize = true;
        }
        return token;
      }

      const formatted = formatSentenceToken(token, shouldCapitalize);
      shouldCapitalize = false;
      return formatted;
    },
  );
}

export function normalizeFreeText(value?: unknown) {
  return normalizeWhitespace(value, true);
}

export function normalizePersonNameList(values?: string[] | null) {
  if (!values?.length) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map((item) => normalizeTitleText(item))
        .filter((item): item is string => Boolean(item)),
    ),
  );
}

function normalizeWhitespace(value?: unknown, keepLineBreaks = false) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = keepLineBreaks
    ? String(value)
        .replace(/\r/g, '')
        .split('\n')
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('\n')
    : String(value).replace(/\s+/g, ' ').trim();

  return normalized.length > 0 ? normalized : null;
}

function formatTitleToken(token: string, isFirstWord: boolean) {
  const uppercaseToken = token.toUpperCase();

  if (shouldPreserveUppercase(token, uppercaseToken)) {
    return uppercaseToken;
  }

  const lowerToken = token.toLowerCase();

  if (!isFirstWord && LOWERCASE_CONNECTORS.has(lowerToken)) {
    return lowerToken;
  }

  return capitalizeWord(lowerToken);
}

function formatSentenceToken(token: string, capitalize: boolean) {
  const uppercaseToken = token.toUpperCase();

  if (shouldPreserveUppercase(token, uppercaseToken)) {
    return uppercaseToken;
  }

  const lowerToken = isAllUppercase(token) ? token.toLowerCase() : token;

  if (capitalize) {
    return capitalizeWord(lowerToken);
  }

  return lowerToken;
}

function shouldPreserveUppercase(token: string, uppercaseToken: string) {
  return (
    PRESERVED_ACRONYMS.has(uppercaseToken) ||
    (hasDigit(token) && isAllUppercase(token))
  );
}

function capitalizeWord(value: string) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isAllUppercase(value: string) {
  return value === value.toUpperCase() && value !== value.toLowerCase();
}

function hasDigit(value: string) {
  return /\d/.test(value);
}
