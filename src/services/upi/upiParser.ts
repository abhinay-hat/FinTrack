/**
 * UPI Transaction Description Parser
 *
 * Parses cryptic UPI/bank transaction descriptions to extract
 * merchant names, UPI IDs, reference numbers, and suggested categories.
 */

export interface UPIParsedResult {
  merchant: string;
  cleanedDescription: string;
  isUPI: boolean;
  upiId?: string;
  referenceId?: string;
  suggestedCategory?: string;
}

// Merchant handle/keyword to clean name + category mapping
const MERCHANT_MAP: Record<string, { name: string; category: string }> = {
  // Food & Dining
  swiggy: { name: 'Swiggy', category: 'Food & Dining' },
  zomato: { name: 'Zomato', category: 'Food & Dining' },
  dominos: { name: "Domino's", category: 'Food & Dining' },
  dominospizza: { name: "Domino's", category: 'Food & Dining' },
  mcdonalds: { name: "McDonald's", category: 'Food & Dining' },
  mcd: { name: "McDonald's", category: 'Food & Dining' },
  kfc: { name: 'KFC', category: 'Food & Dining' },
  starbucks: { name: 'Starbucks', category: 'Food & Dining' },
  subway: { name: 'Subway', category: 'Food & Dining' },
  pizzahut: { name: 'Pizza Hut', category: 'Food & Dining' },
  burgerking: { name: 'Burger King', category: 'Food & Dining' },
  chaipoint: { name: 'Chai Point', category: 'Food & Dining' },
  haldirams: { name: "Haldiram's", category: 'Food & Dining' },
  barbeque: { name: 'Barbeque Nation', category: 'Food & Dining' },
  barbequenation: { name: 'Barbeque Nation', category: 'Food & Dining' },
  behrouz: { name: 'Behrouz Biryani', category: 'Food & Dining' },
  faasos: { name: 'Faasos', category: 'Food & Dining' },
  eatsure: { name: 'EatSure', category: 'Food & Dining' },
  box8: { name: 'Box8', category: 'Food & Dining' },
  dunkin: { name: "Dunkin' Donuts", category: 'Food & Dining' },
  baskinrobbins: { name: 'Baskin Robbins', category: 'Food & Dining' },
  naturals: { name: 'Naturals Ice Cream', category: 'Food & Dining' },
  chaayos: { name: 'Chaayos', category: 'Food & Dining' },
  thirdwave: { name: 'Third Wave Coffee', category: 'Food & Dining' },
  bluestone: { name: 'Blue Tokai', category: 'Food & Dining' },
  bluetokai: { name: 'Blue Tokai', category: 'Food & Dining' },
  freshmenu: { name: 'FreshMenu', category: 'Food & Dining' },

  // Transport
  uber: { name: 'Uber', category: 'Transport' },
  ola: { name: 'Ola', category: 'Transport' },
  rapido: { name: 'Rapido', category: 'Transport' },
  irctc: { name: 'IRCTC', category: 'Transport' },
  redbus: { name: 'redBus', category: 'Transport' },
  makemytrip: { name: 'MakeMyTrip', category: 'Transport' },
  mmt: { name: 'MakeMyTrip', category: 'Transport' },
  goibibo: { name: 'Goibibo', category: 'Transport' },
  cleartrip: { name: 'Cleartrip', category: 'Transport' },
  yatra: { name: 'Yatra', category: 'Transport' },
  indigo: { name: 'IndiGo Airlines', category: 'Transport' },
  airindia: { name: 'Air India', category: 'Transport' },
  spicejet: { name: 'SpiceJet', category: 'Transport' },
  vistara: { name: 'Vistara', category: 'Transport' },
  akasa: { name: 'Akasa Air', category: 'Transport' },
  metro: { name: 'Metro', category: 'Transport' },
  dmrc: { name: 'Delhi Metro', category: 'Transport' },
  bmtc: { name: 'BMTC', category: 'Transport' },
  nammametro: { name: 'Namma Metro', category: 'Transport' },
  fastag: { name: 'FASTag Toll', category: 'Transport' },
  iocl: { name: 'Indian Oil', category: 'Transport' },
  bpcl: { name: 'Bharat Petroleum', category: 'Transport' },
  hpcl: { name: 'Hindustan Petroleum', category: 'Transport' },

  // Shopping
  amazon: { name: 'Amazon', category: 'Shopping' },
  amzn: { name: 'Amazon', category: 'Shopping' },
  flipkart: { name: 'Flipkart', category: 'Shopping' },
  myntra: { name: 'Myntra', category: 'Shopping' },
  ajio: { name: 'AJIO', category: 'Shopping' },
  meesho: { name: 'Meesho', category: 'Shopping' },
  nykaa: { name: 'Nykaa', category: 'Shopping' },
  tatacliq: { name: 'Tata CLiQ', category: 'Shopping' },
  reliancedigital: { name: 'Reliance Digital', category: 'Shopping' },
  croma: { name: 'Croma', category: 'Shopping' },
  snapdeal: { name: 'Snapdeal', category: 'Shopping' },
  lenskart: { name: 'Lenskart', category: 'Shopping' },
  purplle: { name: 'Purplle', category: 'Shopping' },
  pepperfry: { name: 'Pepperfry', category: 'Shopping' },
  urbanladder: { name: 'Urban Ladder', category: 'Shopping' },
  firstcry: { name: 'FirstCry', category: 'Shopping' },
  decathlon: { name: 'Decathlon', category: 'Shopping' },
  shoppers: { name: 'Shoppers Stop', category: 'Shopping' },
  lifestyle: { name: 'Lifestyle', category: 'Shopping' },
  westside: { name: 'Westside', category: 'Shopping' },
  pantaloons: { name: 'Pantaloons', category: 'Shopping' },

  // Bills & Utilities
  airtel: { name: 'Airtel', category: 'Bills & Utilities' },
  jio: { name: 'Jio', category: 'Bills & Utilities' },
  vi: { name: 'Vi', category: 'Bills & Utilities' },
  vodafone: { name: 'Vi', category: 'Bills & Utilities' },
  bsnl: { name: 'BSNL', category: 'Bills & Utilities' },
  tataplay: { name: 'Tata Play', category: 'Bills & Utilities' },
  tatasky: { name: 'Tata Play', category: 'Bills & Utilities' },
  dishtv: { name: 'Dish TV', category: 'Bills & Utilities' },
  d2h: { name: 'D2H', category: 'Bills & Utilities' },
  bescom: { name: 'BESCOM', category: 'Bills & Utilities' },
  msedcl: { name: 'MSEDCL', category: 'Bills & Utilities' },
  tneb: { name: 'TNEB', category: 'Bills & Utilities' },
  wbsedcl: { name: 'WBSEDCL', category: 'Bills & Utilities' },
  bses: { name: 'BSES', category: 'Bills & Utilities' },
  cesc: { name: 'CESC', category: 'Bills & Utilities' },
  torrent: { name: 'Torrent Power', category: 'Bills & Utilities' },
  tpddl: { name: 'TPDDL', category: 'Bills & Utilities' },
  adani: { name: 'Adani Electricity', category: 'Bills & Utilities' },
  mahanagar: { name: 'Mahanagar Gas', category: 'Bills & Utilities' },
  igl: { name: 'IGL', category: 'Bills & Utilities' },
  gail: { name: 'GAIL Gas', category: 'Bills & Utilities' },
  hathway: { name: 'Hathway', category: 'Bills & Utilities' },
  actfiber: { name: 'ACT Fibernet', category: 'Bills & Utilities' },
  act: { name: 'ACT Fibernet', category: 'Bills & Utilities' },

  // Entertainment
  netflix: { name: 'Netflix', category: 'Entertainment' },
  hotstar: { name: 'Disney+ Hotstar', category: 'Entertainment' },
  disney: { name: 'Disney+ Hotstar', category: 'Entertainment' },
  spotify: { name: 'Spotify', category: 'Entertainment' },
  jiocinema: { name: 'JioCinema', category: 'Entertainment' },
  amazonprime: { name: 'Amazon Prime', category: 'Entertainment' },
  prime: { name: 'Amazon Prime', category: 'Entertainment' },
  zee5: { name: 'ZEE5', category: 'Entertainment' },
  sonyliv: { name: 'SonyLIV', category: 'Entertainment' },
  youtube: { name: 'YouTube Premium', category: 'Entertainment' },
  bookmyshow: { name: 'BookMyShow', category: 'Entertainment' },
  bms: { name: 'BookMyShow', category: 'Entertainment' },
  pvr: { name: 'PVR', category: 'Entertainment' },
  inox: { name: 'INOX', category: 'Entertainment' },
  gaana: { name: 'Gaana', category: 'Entertainment' },
  jiosaavn: { name: 'JioSaavn', category: 'Entertainment' },
  wynk: { name: 'Wynk Music', category: 'Entertainment' },

  // Health
  apollo: { name: 'Apollo', category: 'Health' },
  practo: { name: 'Practo', category: 'Health' },
  onemg: { name: '1mg', category: 'Health' },
  '1mg': { name: '1mg', category: 'Health' },
  pharmeasy: { name: 'PharmEasy', category: 'Health' },
  netmeds: { name: 'Netmeds', category: 'Health' },
  medplus: { name: 'MedPlus', category: 'Health' },
  maxhospital: { name: 'Max Hospital', category: 'Health' },
  fortis: { name: 'Fortis', category: 'Health' },
  manipal: { name: 'Manipal Hospital', category: 'Health' },
  narayana: { name: 'Narayana Health', category: 'Health' },
  cultfit: { name: 'cult.fit', category: 'Health' },
  cult: { name: 'cult.fit', category: 'Health' },
  healthifyme: { name: 'HealthifyMe', category: 'Health' },

  // Education
  coursera: { name: 'Coursera', category: 'Education' },
  udemy: { name: 'Udemy', category: 'Education' },
  unacademy: { name: 'Unacademy', category: 'Education' },
  byjus: { name: "BYJU'S", category: 'Education' },
  vedantu: { name: 'Vedantu', category: 'Education' },
  upgrad: { name: 'upGrad', category: 'Education' },
  simplilearn: { name: 'Simplilearn', category: 'Education' },
  scaler: { name: 'Scaler', category: 'Education' },
  skillshare: { name: 'Skillshare', category: 'Education' },
  linkedin: { name: 'LinkedIn Learning', category: 'Education' },

  // Investments
  zerodha: { name: 'Zerodha', category: 'Investments' },
  groww: { name: 'Groww', category: 'Investments' },
  angelone: { name: 'Angel One', category: 'Investments' },
  angel: { name: 'Angel One', category: 'Investments' },
  upstox: { name: 'Upstox', category: 'Investments' },
  coin: { name: 'Coin by Zerodha', category: 'Investments' },
  kuvera: { name: 'Kuvera', category: 'Investments' },
  etmoney: { name: 'ET Money', category: 'Investments' },
  paytmmoney: { name: 'Paytm Money', category: 'Investments' },
  smallcase: { name: 'Smallcase', category: 'Investments' },
  lic: { name: 'LIC', category: 'Investments' },
  sbilife: { name: 'SBI Life', category: 'Investments' },
  hdfclife: { name: 'HDFC Life', category: 'Investments' },
  icicipru: { name: 'ICICI Prudential', category: 'Investments' },
  phonepewealth: { name: 'PhonePe Wealth', category: 'Investments' },

  // Rent/EMI
  bajajfinance: { name: 'Bajaj Finance', category: 'Rent & EMI' },
  bajajfinserv: { name: 'Bajaj Finserv', category: 'Rent & EMI' },
  hdfcltd: { name: 'HDFC Ltd', category: 'Rent & EMI' },
  sbihome: { name: 'SBI Home Loan', category: 'Rent & EMI' },
  lichfl: { name: 'LIC HFL', category: 'Rent & EMI' },
  pnbhousing: { name: 'PNB Housing', category: 'Rent & EMI' },

  // Groceries
  bigbasket: { name: 'BigBasket', category: 'Groceries' },
  blinkit: { name: 'Blinkit', category: 'Groceries' },
  zepto: { name: 'Zepto', category: 'Groceries' },
  jiomart: { name: 'JioMart', category: 'Groceries' },
  dmart: { name: 'DMart', category: 'Groceries' },
  dunzo: { name: 'Dunzo', category: 'Groceries' },
  reliancefresh: { name: 'Reliance Fresh', category: 'Groceries' },
  moresupermarket: { name: 'More Supermarket', category: 'Groceries' },
  starbazaar: { name: 'Star Bazaar', category: 'Groceries' },
  spencers: { name: "Spencer's", category: 'Groceries' },
  instamart: { name: 'Swiggy Instamart', category: 'Groceries' },
  naturesbasket: { name: "Nature's Basket", category: 'Groceries' },

  // Payment platforms (no specific category - contextual)
  paytm: { name: 'Paytm', category: 'Others' },
  phonepe: { name: 'PhonePe', category: 'Others' },
  gpay: { name: 'Google Pay', category: 'Others' },
  googlepay: { name: 'Google Pay', category: 'Others' },
  cred: { name: 'CRED', category: 'Others' },
  slice: { name: 'Slice', category: 'Others' },
  simpl: { name: 'Simpl', category: 'Others' },
  lazypay: { name: 'LazyPay', category: 'Others' },
  freecharge: { name: 'Freecharge', category: 'Others' },
  mobikwik: { name: 'MobiKwik', category: 'Others' },
};

// Common Indian bank suffixes to strip from UPI handles
const BANK_SUFFIXES = [
  'yesbank', 'ybl', 'icici', 'icicib', 'sbi', 'okaxis', 'okhdfcbank',
  'okicici', 'oksbi', 'axisbank', 'hdfcbank', 'kotak', 'ibl',
  'paytm', 'apl', 'upi', 'indus', 'federal', 'rbl', 'idbi',
  'pnb', 'bob', 'canara', 'union', 'boi',
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s@/.-]/g, '').trim();
}

function titleCase(text: string): string {
  return text
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function lookupMerchant(term: string): { name: string; category: string } | null {
  const cleaned = term.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (MERCHANT_MAP[cleaned]) {
    return MERCHANT_MAP[cleaned];
  }
  // Try partial matching against keys
  for (const [key, value] of Object.entries(MERCHANT_MAP)) {
    if (cleaned.includes(key) && key.length >= 3) {
      return value;
    }
  }
  return null;
}

function extractFromUPIHandle(handle: string): { name: string; category: string } | null {
  // UPI handle format: merchant@bank
  const parts = handle.split('@');
  const merchantPart = parts[0].toLowerCase().replace(/[^a-z0-9]/g, '');

  // Check direct lookup
  const direct = lookupMerchant(merchantPart);
  if (direct) return direct;

  // Strip bank suffix and try again
  for (const suffix of BANK_SUFFIXES) {
    if (merchantPart.endsWith(suffix)) {
      const stripped = merchantPart.slice(0, -suffix.length);
      if (stripped.length >= 2) {
        const result = lookupMerchant(stripped);
        if (result) return result;
      }
    }
  }

  return null;
}

function parseUPISlashFormat(raw: string): Partial<UPIParsedResult> {
  // Format: UPI/345678901/Payment to SWIGGY
  // Format: UPI/DR/450001234567/ZOMATO/YESB
  // Format: UPI/CR/450001234567/MERCHANT/BANK
  const parts = raw.split('/');

  let referenceId: string | undefined;
  let merchantName = '';
  let upiId: string | undefined;

  // Skip UPI, DR/CR markers
  const contentParts = parts.filter(
    (p) => !['upi', 'dr', 'cr'].includes(p.toLowerCase()),
  );

  for (const part of contentParts) {
    const trimmed = part.trim();
    // Reference IDs are usually long numeric strings
    if (/^\d{6,}$/.test(trimmed)) {
      referenceId = trimmed;
      continue;
    }
    // Bank codes are short uppercase
    if (BANK_SUFFIXES.some((b) => trimmed.toLowerCase() === b) || /^[A-Z]{2,5}$/.test(trimmed)) {
      continue;
    }
    // "Payment to X" pattern
    const paymentTo = trimmed.match(/payment\s+to\s+(.+)/i);
    if (paymentTo) {
      merchantName = paymentTo[1].trim();
      continue;
    }
    // Remaining non-empty parts are likely merchant names
    if (trimmed.length >= 2 && !merchantName) {
      merchantName = trimmed;
    }
  }

  return { referenceId, merchant: merchantName, upiId };
}

function parseDashFormat(raw: string): Partial<UPIParsedResult> {
  // Format: UPI-SWIGGY-ORDER123
  const parts = raw.split('-');
  const contentParts = parts.filter(
    (p) => !['upi', 'dr', 'cr'].includes(p.toLowerCase()),
  );

  let merchant = '';
  let referenceId: string | undefined;

  for (const part of contentParts) {
    const trimmed = part.trim();
    if (/order|ref|txn/i.test(trimmed)) {
      referenceId = trimmed;
      continue;
    }
    if (/^\d{6,}$/.test(trimmed)) {
      referenceId = trimmed;
      continue;
    }
    if (!merchant && trimmed.length >= 2) {
      merchant = trimmed;
    }
  }

  return { merchant, referenceId };
}

function parseAtFormat(raw: string): Partial<UPIParsedResult> {
  // Format: SWIGGY@YESBANK or merchant@bankhandle
  const atIndex = raw.indexOf('@');
  if (atIndex === -1) return {};

  const upiId = raw.trim();
  const result = extractFromUPIHandle(raw);

  return {
    merchant: result?.name ?? '',
    upiId,
    suggestedCategory: result?.category,
  };
}

function parsePOSFormat(raw: string): Partial<UPIParsedResult> {
  // Format: POS/xxxx1234/AMAZON or POS xxxx1234 AMAZON
  const cleaned = raw.replace(/^pos\s*/i, '').replace(/\//g, ' ');
  const parts = cleaned.split(/\s+/).filter(Boolean);

  let merchant = '';
  for (const part of parts) {
    // Skip card number masks
    if (/^x{2,}\d+$/i.test(part) || /^\d{4,}$/.test(part)) continue;
    if (!merchant && part.length >= 2) {
      merchant = part;
    }
  }

  return { merchant };
}

export function parseUPIDescription(raw: string): UPIParsedResult {
  if (!raw || typeof raw !== 'string') {
    return {
      merchant: 'Unknown',
      cleanedDescription: raw ?? '',
      isUPI: false,
    };
  }

  const trimmed = raw.trim();
  const normalized = normalize(trimmed);

  let result: UPIParsedResult = {
    merchant: '',
    cleanedDescription: trimmed,
    isUPI: false,
  };

  // Detect if UPI transaction
  const isUPI =
    /^upi[/-]/i.test(trimmed) ||
    /@/.test(trimmed) ||
    /\bupi\b/i.test(trimmed);

  result.isUPI = isUPI;

  // Check for NEFT/IMPS/RTGS transfers
  const isTransfer = /^(neft|imps|rtgs)[/-]/i.test(trimmed);
  if (isTransfer) {
    const transferParts = trimmed.split(/[/-]/).filter(Boolean);
    const transferType = transferParts[0].toUpperCase();
    const remaining = transferParts.slice(1).filter(
      (p) => !/^\d{6,}$/.test(p.trim()),
    );
    const name = remaining.length > 0 ? remaining[remaining.length - 1].trim() : transferType;
    result.merchant = titleCase(name);
    result.cleanedDescription = `${transferType} Transfer - ${titleCase(name)}`;
    return result;
  }

  // Check for bill payments BIL/BPAY
  const isBillPay = /^(bil|bpay)[/-]/i.test(trimmed);
  if (isBillPay) {
    const billParts = trimmed.split(/[/-]/).filter(Boolean);
    const contentParts = billParts.slice(1).filter(
      (p) => !/^\d{6,}$/.test(p.trim()) && p.trim().length >= 2,
    );
    const billerName = contentParts.length > 0 ? contentParts[0].trim() : 'Bill Payment';
    const lookup = lookupMerchant(billerName);
    result.merchant = lookup?.name ?? titleCase(billerName);
    result.suggestedCategory = lookup?.category ?? 'Bills & Utilities';
    result.cleanedDescription = `Bill Payment - ${result.merchant}`;
    return result;
  }

  // Check for ATM withdrawals
  if (/^atm[/-\s]/i.test(trimmed) || /\batm\b/i.test(normalized)) {
    result.merchant = 'ATM Withdrawal';
    result.cleanedDescription = 'ATM Withdrawal';
    result.suggestedCategory = 'Others';
    return result;
  }

  // POS format
  if (/^pos[/-\s]/i.test(trimmed)) {
    const posResult = parsePOSFormat(trimmed);
    if (posResult.merchant) {
      const lookup = lookupMerchant(posResult.merchant);
      result.merchant = lookup?.name ?? titleCase(posResult.merchant);
      result.suggestedCategory = lookup?.category;
      result.cleanedDescription = `Purchase - ${result.merchant}`;
    }
    return result;
  }

  // UPI slash format: UPI/xxx/xxx
  if (/^upi\//i.test(trimmed)) {
    const parsed = parseUPISlashFormat(trimmed);
    result.referenceId = parsed.referenceId;
    result.upiId = parsed.upiId;
    if (parsed.merchant) {
      const lookup = lookupMerchant(parsed.merchant);
      result.merchant = lookup?.name ?? titleCase(parsed.merchant);
      result.suggestedCategory = lookup?.category;
    }
  }
  // UPI dash format: UPI-MERCHANT-xxx
  else if (/^upi-/i.test(trimmed)) {
    const parsed = parseDashFormat(trimmed);
    result.referenceId = parsed.referenceId;
    if (parsed.merchant) {
      const lookup = lookupMerchant(parsed.merchant);
      result.merchant = lookup?.name ?? titleCase(parsed.merchant);
      result.suggestedCategory = lookup?.category;
    }
  }
  // @ format: MERCHANT@BANK
  else if (/@/.test(trimmed) && !trimmed.includes('/')) {
    const parsed = parseAtFormat(trimmed);
    result.upiId = parsed.upiId;
    if (parsed.merchant) {
      result.merchant = parsed.merchant;
      result.suggestedCategory = parsed.suggestedCategory;
    }
  }
  // Generic: try to find a merchant name in the raw string
  else {
    const lookup = lookupMerchant(normalized);
    if (lookup) {
      result.merchant = lookup.name;
      result.suggestedCategory = lookup.category;
    }
  }

  // Final fallback: clean up merchant name
  if (!result.merchant) {
    // Extract meaningful words from the description
    const words = trimmed.split(/[\s/\-_@]+/).filter(
      (w) =>
        w.length >= 2 &&
        !/^\d+$/.test(w) &&
        !BANK_SUFFIXES.includes(w.toLowerCase()) &&
        !['upi', 'dr', 'cr', 'payment', 'to', 'from'].includes(w.toLowerCase()),
    );
    result.merchant = words.length > 0 ? titleCase(words.join(' ')) : 'Unknown';
  }

  // Build cleaned description
  if (result.merchant && result.merchant !== 'Unknown') {
    if (isUPI) {
      result.cleanedDescription = `UPI Payment - ${result.merchant}`;
    } else {
      result.cleanedDescription = result.merchant;
    }
  }

  return result;
}
