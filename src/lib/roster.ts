// Simulated traveller roster for the SENTRY-ZA demo.
// Generates varied, realistic-looking subjects instead of cycling 5 fixed people.

export type Category = "citizen" | "visa" | "permit" | "expired" | "flagged" | "unknown";

export interface Traveller {
  name: string;
  nationality: string;
  docId: string;
  docType: string;
  category: Category;
  status: "valid" | "invalid";
  reason: string;
  matchScore: number; // 0-100
  age: number;
  sex: "M" | "F";
  watchlist: boolean;
}

const ZA_FIRST = ["Thandiwe", "Sipho", "Lerato", "Bongani", "Naledi", "Kagiso", "Zanele", "Tshepo", "Ayanda", "Mandla", "Nomsa", "Sibusiso", "Refilwe", "Andile", "Palesa", "Johan", "Anika", "Pieter", "Rashid", "Fatima"];
const ZA_LAST = ["Mokoena", "Nkosi", "Dlamini", "Mahlangu", "Khumalo", "Botha", "Van Wyk", "Ndlovu", "Sithole", "Maritz", "Molefe", "Zulu", "Pillay", "Naidoo", "Abrahams", "Mthembu"];

const FOREIGN: { nationality: string; prefix: string; first: string[]; last: string[] }[] = [
  { nationality: "Zimbabwe", prefix: "ZW", first: ["Tendai", "Rudo", "Farai", "Chipo", "Blessing", "Tafara"], last: ["Moyo", "Chikwanha", "Mutasa", "Nyathi", "Dube", "Marange"] },
  { nationality: "Mozambique", prefix: "MZ", first: ["João", "Carlitos", "Amélia", "Fernando", "Inácio", "Rosa"], last: ["Silva", "Macuácua", "Cossa", "Matsinhe", "Chissano", "Mabote"] },
  { nationality: "Lesotho", prefix: "LS", first: ["Teboho", "Mpho", "Lineo", "Retšelisitsoe", "Nthabiseng"], last: ["Mofokeng", "Letsie", "Ramohlanka", "Seeiso", "Thabane"] },
  { nationality: "Malawi", prefix: "MW", first: ["Chimwemwe", "Thoko", "Dalitso", "Mphatso"], last: ["Banda", "Phiri", "Mwale", "Chirwa"] },
  { nationality: "Nigeria", prefix: "NG", first: ["Aisha", "Chinedu", "Ifeoma", "Emeka", "Yusuf"], last: ["Bello", "Okafor", "Adeyemi", "Okonkwo", "Danjuma"] },
  { nationality: "Ghana", prefix: "GH", first: ["Kwame", "Abena", "Kofi", "Akosua"], last: ["Asante", "Mensah", "Boateng", "Owusu"] },
  { nationality: "Botswana", prefix: "BW", first: ["Kabelo", "Lesego", "Onkarabile"], last: ["Kgosi", "Seretse", "Motswana"] },
  { nationality: "Namibia", prefix: "NA", first: ["Helvi", "Petrus", "Ndapewa"], last: ["Shikongo", "Nghipandulwa", "Amutenya"] },
  { nationality: "Eswatini", prefix: "SZ", first: ["Sifiso", "Nomcebo", "Bhekithemba"], last: ["Shongwe", "Mamba", "Simelane"] },
  { nationality: "DR Congo", prefix: "CD", first: ["Patrice", "Esther", "Jean-Claude"], last: ["Mulumba", "Kabila", "Tshisekedi"] },
  { nationality: "Pakistan", prefix: "PK", first: ["Imran", "Sana", "Bilal"], last: ["Khan", "Raza", "Iqbal"] },
  { nationality: "Bangladesh", prefix: "BD", first: ["Rahim", "Nasrin", "Shakil"], last: ["Hossain", "Rahman", "Islam"] },
];

const FLAG_REASONS = [
  "INTERPOL red notice — human trafficking",
  "Deportation order active (Immigration Act 13/2002)",
  "Previous overstay — 5-year entry ban",
  "Fraudulent document detected in prior entry",
  "SAPS warrant outstanding",
];

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const num = (n: number) => String(Math.floor(Math.random() * Math.pow(10, n))).padStart(n, "0");

function weightedCategory(): Category {
  const r = Math.random();
  if (r < 0.34) return "citizen";
  if (r < 0.56) return "visa";
  if (r < 0.7) return "permit";
  if (r < 0.85) return "expired";
  if (r < 0.94) return "unknown";
  return "flagged";
}

function futureYear() {
  return 2026 + Math.floor(Math.random() * 4);
}

export function generateTraveller(): Traveller {
  const category = weightedCategory();
  const sex: "M" | "F" = Math.random() < 0.5 ? "M" : "F";
  const age = 18 + Math.floor(Math.random() * 46);

  if (category === "citizen") {
    const name = `${pick(ZA_FIRST)} ${pick(ZA_LAST)}`;
    const yy = String(new Date().getFullYear() - age).slice(2);
    const docId = `${yy}${num(2)}${num(2)} ${num(4)} ${num(3)}`; // SA ID format
    return {
      name,
      nationality: "South Africa",
      docId,
      docType: "RSA Smart ID",
      category,
      status: "valid",
      reason: "Citizen identity confirmed — Home Affairs NPR match",
      matchScore: 96 + Math.random() * 3.8,
      age,
      sex,
      watchlist: false,
    };
  }

  const f = pick(FOREIGN);
  const name = `${pick(f.first)} ${pick(f.last)}`;
  const base = {
    nationality: f.nationality,
    age,
    sex,
  };

  switch (category) {
    case "visa":
      return {
        ...base,
        name,
        docId: `${f.prefix}-V${num(6)}`,
        docType: pick(["Visitor's Visa (Sec 11)", "Work Visa (Sec 19)", "Study Visa (Sec 13)"]),
        category,
        status: "valid",
        reason: `Visa valid until ${futureYear()} — VFS record matched`,
        matchScore: 93 + Math.random() * 6,
        watchlist: false,
      };
    case "permit":
      return {
        ...base,
        name,
        docId: `${f.prefix}-ZEP-${num(7)}`,
        docType: pick(["SADC Special Permit", "Asylum Seeker Permit (Sec 22)", "Cross-Border Trader Permit"]),
        category,
        status: "valid",
        reason: `Permit in good standing — renewal due ${futureYear()}`,
        matchScore: 90 + Math.random() * 8,
        watchlist: false,
      };
    case "expired":
      return {
        ...base,
        name,
        docId: `${f.prefix}-EXP-${num(6)}`,
        docType: pick(["Visitor's Visa (Sec 11)", "Asylum Seeker Permit (Sec 22)", "Work Visa (Sec 19)"]),
        category,
        status: "invalid",
        reason: `Document expired ${2021 + Math.floor(Math.random() * 5)} — overstay ${30 + Math.floor(Math.random() * 900)} days`,
        matchScore: 88 + Math.random() * 10,
        watchlist: false,
      };
    case "flagged":
      return {
        ...base,
        name,
        docId: `${f.prefix}-${num(8)}`,
        docType: "Passport",
        category,
        status: "invalid",
        reason: pick(FLAG_REASONS),
        matchScore: 94 + Math.random() * 5.5,
        watchlist: true,
      };
    default:
      return {
        ...base,
        name: "UNKNOWN SUBJECT",
        nationality: "Unverified",
        docId: "—",
        docType: "No document presented",
        category: "unknown",
        status: "invalid",
        reason: "No biometric match in Home Affairs or SADC databases",
        matchScore: 11 + Math.random() * 42,
        watchlist: false,
      };
  }
}

export const CATEGORY_LABEL: Record<Category, string> = {
  citizen: "RSA CITIZEN",
  visa: "VISA HOLDER",
  permit: "PERMIT HOLDER",
  expired: "EXPIRED DOCUMENT",
  flagged: "WATCHLIST HIT",
  unknown: "UNIDENTIFIED",
};
