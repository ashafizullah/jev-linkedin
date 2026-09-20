/**
 * Ekstraksi profil dari teks CV secara deterministik.
 *
 * Sengaja tanpa model bahasa: hasilnya bisa diprediksi, instan, dan tidak perlu
 * mengirim CV ke endpoint kedua. Yang diambil hanya fakta yang memang lazim
 * tertulis di CV.
 *
 * Preferensi lamaran (izin kerja, ekspektasi gaji, mode kerja) tidak ada di sini
 * karena memang bukan isi CV — dan diukur tidak mengubah keputusan.
 */

const SKILLS = [
  ["JavaScript", [/\bjavascript\b/i]],
  ["TypeScript", [/\btypescript\b/i]],
  ["Python", [/\bpython\b/i]],
  ["Java", [/\bjava\b(?!script)/i]],
  ["Kotlin", [/\bkotlin\b/i]],
  ["Swift", [/\bswift\b/i]],
  ["Golang", [/\bgolang\b/i]],
  ["Rust", [/\brust\b/i]],
  ["PHP", [/\bphp\b/i]],
  ["Ruby", [/\bruby\b/i]],
  ["C#", [/\bc#\b/i, /\bcsharp\b/i]],
  ["C++", [/\bc\+\+\b/i]],
  ["Dart", [/\bdart\b/i]],
  ["SQL", [/\bsql\b/i]],

  ["React", [/\breact(?:\.js|js)?\b/i]],
  ["Next.js", [/\bnext(?:\.js|js)\b/i]],
  ["Vue", [/\bvue(?:\.js|js)?\b/i]],
  ["Angular", [/\bangular\b/i]],
  ["Svelte", [/\bsvelte(?:kit)?\b/i]],
  ["React Native", [/\breact native\b/i]],
  ["Flutter", [/\bflutter\b/i]],
  ["Tailwind", [/\btailwind\b/i]],
  ["HTML", [/\bhtml5?\b/i]],
  ["CSS", [/\bcss3?\b/i]],

  ["Node.js", [/\bnode(?:\.js|js)\b/i]],
  ["Express", [/\bexpress(?:\.js|js)?\b/i]],
  ["NestJS", [/\bnest(?:\.js|js)\b/i]],
  ["Django", [/\bdjango\b/i]],
  ["Flask", [/\bflask\b/i]],
  ["FastAPI", [/\bfastapi\b/i]],
  ["Laravel", [/\blaravel\b/i]],
  ["Spring", [/\bspring(?: boot)?\b/i]],
  ["Rails", [/\brails\b/i]],
  [".NET", [/\b\.net\b/i]],
  ["GraphQL", [/\bgraphql\b/i]],
  ["REST API", [/\brestful\b/i, /\brest\s*api\b/i]],
  ["gRPC", [/\bgrpc\b/i]],
  ["Kafka", [/\bkafka\b/i]],
  ["RabbitMQ", [/\brabbitmq\b/i]],

  ["PostgreSQL", [/\bpostgres(?:ql)?\b/i]],
  ["MySQL", [/\bmysql\b/i]],
  ["MongoDB", [/\bmongo(?:db)?\b/i]],
  ["Redis", [/\bredis\b/i]],
  ["Elasticsearch", [/\belasticsearch\b/i]],

  ["Docker", [/\bdocker\b/i]],
  ["Kubernetes", [/\bkubernetes\b/i, /\bk8s\b/i]],
  ["AWS", [/\baws\b/i, /\bamazon web services\b/i]],
  ["GCP", [/\bgcp\b/i, /\bgoogle cloud\b/i]],
  ["Azure", [/\bazure\b/i]],
  ["Terraform", [/\bterraform\b/i]],
  ["CI/CD", [/\bci\/cd\b/i, /\bcontinuous (?:integration|delivery|deployment)\b/i]],
  ["Git", [/\bgit(?:hub|lab)?\b/i]],
  ["Linux", [/\blinux\b/i]],

  ["Machine Learning", [/\bmachine learning\b/i]],
  ["TensorFlow", [/\btensorflow\b/i]],
  ["PyTorch", [/\bpytorch\b/i]],
  ["Pandas", [/\bpandas\b/i]],
  ["Spark", [/\bspark\b/i]],
  ["Airflow", [/\bairflow\b/i]],
  ["Tableau", [/\btableau\b/i]],
  ["Power BI", [/\bpower\s*bi\b/i]],

  ["Figma", [/\bfigma\b/i]],

  // ---- keuangan & akuntansi ----
  ["Akuntansi", [/\bakuntansi\b/i, /\baccounting\b/i]],
  ["Audit", [/\baudit(?:ing)?\b/i]],
  ["Perpajakan", [/\bperpajakan\b/i, /\bperpa[jk]akan\b/i, /\btaxation\b/i, /\bbrevet\b/i]],
  ["Laporan keuangan", [/\blaporan keuangan\b/i, /\bfinancial (?:report|statement)s?\b/i]],
  ["Rekonsiliasi", [/\brekonsiliasi\b/i, /\breconciliation\b/i]],
  ["SAP", [/\bsap\b/i]],
  ["MYOB", [/\bmyob\b/i]],
  ["Accurate", [/\baccurate\b/i]],
  ["Payroll", [/\bpayroll\b/i, /\bpenggajian\b/i]],
  ["PSAK / IFRS", [/\bpsak\b/i, /\bifrs\b/i]],
  ["Budgeting", [/\bbudgeting\b/i, /\bpenganggaran\b/i, /\banggaran\b/i]],

  // ---- administrasi & perkantoran ----
  ["Microsoft Excel", [/\bexcel\b/i]],
  ["Microsoft Word", [/\b(?:ms|microsoft)\s*word\b/i]],
  ["PowerPoint", [/\bpower\s*point\b/i]],
  ["Microsoft Office", [/\b(?:ms|microsoft)\s*office\b/i]],
  ["Google Workspace", [/\bgoogle (?:workspace|sheets|docs|slides)\b/i]],
  ["Data entry", [/\bdata entry\b/i]],
  ["Administrasi", [/\badministrasi\b/i, /\badministration\b/i]],
  ["Kearsipan", [/\bkearsipan\b/i, /\bfiling\b/i]],

  // ---- sumber daya manusia ----
  ["Rekrutmen", [/\brekrutmen\b/i, /\brecruit(?:ment|ing)\b/i, /\btalent acquisition\b/i]],
  ["HRIS", [/\bhris\b/i]],
  ["KPI / OKR", [/\bkpi\b/i, /\bokr\b/i]],
  ["Penilaian kinerja", [/\bpenilaian kinerja\b/i, /\bperformance (?:management|appraisal)\b/i]],
  ["Hubungan industrial", [/\bhubungan industrial\b/i, /\bindustrial relations\b/i]],

  // ---- penjualan & pemasaran ----
  ["SEO", [/\bseo\b/i]],
  ["Google Ads", [/\bgoogle ads?\b/i, /\badwords\b/i, /\bsem\b/i]],
  ["Google Analytics", [/\bgoogle analytics\b/i, /\bga4\b/i]],
  ["Media sosial", [/\bmedia sosial\b/i, /\bsocial media\b/i]],
  ["Copywriting", [/\bcopywrit(?:er|ing)\b/i]],
  ["Content marketing", [/\bcontent marketing\b/i]],
  ["CRM", [/\bcrm\b/i]],
  ["Salesforce", [/\bsalesforce\b/i]],
  ["HubSpot", [/\bhubspot\b/i]],
  ["Riset pasar", [/\briset pasar\b/i, /\bmarket research\b/i]],
  ["Negosiasi", [/\bnegosiasi\b/i, /\bnegotiation\b/i]],
  ["Merchandising", [/\bmerchandis/i]],

  // ---- kesehatan ----
  ["Keperawatan", [/\bkeperawatan\b/i, /\bnursing\b/i, /\bperawat\b/i]],
  ["Asuhan keperawatan", [/\basuhan keperawatan\b/i]],
  ["Rekam medis", [/\brekam medis\b/i, /\bmedical record/i]],
  ["Farmasi", [/\bfarmasi\b/i, /\bpharmacy\b/i, /\bapoteker\b/i]],
  ["BLS / ACLS", [/\bbls\b/i, /\bacls\b/i, /\bbtcls\b/i]],
  ["ICU / IGD", [/\bicu\b/i, /\bigd\b/i, /\bemergency room\b/i]],
  ["Flebotomi", [/\bflebotomi\b/i, /\bphlebotomy\b/i]],
  ["USG", [/\busg\b/i, /\bultrasound\b/i]],
  ["Pemeriksaan fisik", [/\bpemeriksaan fisik\b/i, /\bphysical examination\b/i]],

  // ---- pendidikan ----
  ["Kurikulum", [/\bkurikulum\b/i, /\bcurriculum\b/i]],
  ["Manajemen kelas", [/\bmanajemen kelas\b/i, /\bclassroom management\b/i]],
  ["RPP / lesson plan", [/\brpp\b/i, /\blesson plan/i]],
  ["E-learning", [/\be-?learning\b/i, /\bmoodle\b/i]],
  ["Penelitian", [/\bpenelitian\b/i]],

  // ---- desain & kreatif ----
  ["Adobe Photoshop", [/\bphotoshop\b/i]],
  ["Adobe Illustrator", [/\billustrator\b/i]],
  ["InDesign", [/\bindesign\b/i]],
  ["Canva", [/\bcanva\b/i]],
  ["UI/UX", [/\bui\/ux\b/i, /\buser experience\b/i]],
  ["Wireframing", [/\bwirefram/i]],
  ["Video editing", [/\bvideo edit/i, /\bpremiere pro\b/i, /\bcapcut\b/i]],

  // ---- teknik, manufaktur, dan lapangan ----
  ["AutoCAD", [/\bautocad\b/i]],
  ["SolidWorks", [/\bsolidworks\b/i]],
  ["CATIA", [/\bcatia\b/i]],
  ["PLC", [/\bplc\b/i]],
  ["SCADA", [/\bscada\b/i]],
  ["K3 / HSE", [/\bk3\b/i, /\bhse\b/i, /\bkeselamatan kerja\b/i]],
  ["RAB / estimasi biaya", [/\brab\b/i, /\bcost estimat/i]],
  ["Manajemen proyek", [/\bmanajemen proyek\b/i, /\bproject management\b/i]],
  ["Pengadaan", [/\bpengadaan\b/i, /\bprocurement\b/i]],
  ["Manajemen inventaris", [/\binventaris\b/i, /\binventory\b/i, /\bwarehouse\b/i]],
  ["Rantai pasok", [/\brantai pasok\b/i, /\bsupply chain\b/i]],
  ["Quality control", [/\bquality control\b/i, /\bqc\b/i]],

  // ---- perhotelan, kuliner, dan layanan ----
  ["HACCP / food safety", [/\bhaccp\b/i, /\bfood safety\b/i]],
  ["Barista", [/\bbarista\b/i]],
  ["Layanan pelanggan", [/\bcustomer service\b/i, /\blayanan pelanggan\b/i, /\bpelayanan pelanggan\b/i]],
  ["Housekeeping", [/\bhousekeeping\b/i]],

  // ---- hukum & kepatuhan ----
  ["Drafting kontrak", [/\bdrafting\b/i, /\bperjanjian\b/i]],
  ["Kepatuhan", [/\bkepatuhan\b/i, /\bcompliance\b/i]],
  ["ISO", [/\biso\s?\d{4,5}\b/i]],

  // ---- umum, berlaku di bidang apa pun ----
  ["Analisis data", [/\banalisis data\b/i, /\bdata analysis\b/i]],
  ["SPSS", [/\bspss\b/i]],
  ["Statistik", [/\bstatistik\b/i, /\bstatistics\b/i]],
  ["Agile / Scrum", [/\bagile\b/i, /\bscrum\b/i]],
  ["Jira", [/\bjira\b/i]],
  ["Kepemimpinan", [/\bkepemimpinan\b/i, /\bleadership\b/i]],
  ["Komunikasi", [/\bkomunikasi\b/i, /\bcommunication\b/i]],
];

const DEGREES =
  /\b(s1|s2|s3|d1|d2|d3|d4|smk|stm|sma|sarjana|magister|doktor|profesi|bachelor|master|msc|mba|phd|doctorate|diploma|associate)\b/i;

// Institusi, dipakai untuk memilih baris pendidikan yang paling meyakinkan.
const SCHOOLS =
  /\b(universitas|university|institut|institute|politeknik|polytechnic|akademi|academy|sekolah|school|stikes|stie|stmik|smk|sma|fakultas)\b/i;

// Judul peran lintas bidang. Dipakai untuk menebak headline dari CV, jadi
// sengaja luas: bukan hanya peran teknologi.
const ROLE_WORDS = new RegExp(
  `\\b(?:${[
    // teknologi
    "engineer", "developer", "programmer", "devops", "frontend", "front-end", "backend",
    "back-end", "full\\s*stack", "fullstack", "tester", "qa", "scientist", "architect",
    "data", "analis", "analyst",
    // bisnis, kantor, manajemen
    "manager", "supervisor", "lead", "head", "director", "coordinator", "officer", "staff",
    "executive", "administrator", "admin", "secretary", "sekretaris", "receptionist",
    "resepsionis", "clerk", "assistant", "asisten", "konsultan", "consultant", "specialist",
    "spesialis", "pengawas", "kepala",
    // keuangan
    "accountant", "akuntan", "finance", "auditor", "tax", "pajak", "teller", "kasir", "cashier",
    "bookkeeper", "bendahara",
    // penjualan & pemasaran
    "sales", "marketing", "pemasaran", "business\\s*development", "account\\s*executive", "brand",
    "public\\s*relations", "humas", "copywriter", "writer", "penulis", "content", "seo",
    "promotor", "merchandiser",
    // SDM
    "hr", "human\\s*resources", "recruiter", "rekrutmen", "payroll", "people",
    // kesehatan
    "nurse", "perawat", "dokter", "doctor", "bidan", "apoteker", "pharmacist", "radiographer",
    "terapis", "therapist", "caregiver", "paramedis", "farmasi", "nutrisionis", "dietisien",
    // pendidikan
    "teacher", "guru", "dosen", "lecturer", "tutor", "instruktur", "instructor", "pengajar",
    // desain & kreatif
    "designer", "desainer", "illustrator", "animator", "editor", "videographer", "photographer",
    "fotografer", "creator", "penyiar",
    // hukum
    "lawyer", "advokat", "legal", "notaris", "paralegal", "compliance",
    // perhotelan & kuliner
    "chef", "koki", "barista", "waiter", "waitress", "pramusaji", "housekeeping",
    "front\\s*office", "hotel", "resepsionis",
    // logistik & manufaktur
    "driver", "sopir", "kurir", "courier", "warehouse", "gudang", "logistik", "supply\\s*chain",
    "procurement", "purchasing", "operator", "teknisi", "technician", "mekanik", "mechanic",
    "welder", "las", "produksi", "quality\\s*control",
    // jasa & lapangan
    "security", "satpam", "cleaning", "gardener", "tukang", "montir",
    // umum
    "magang", "intern", "trainee", "freelance", "founder", "owner", "pemilik",
  ].join("|")})\\b`,
  "i",
);

const LANGUAGES = [
  ["Indonesia", [/\bindonesia(n)?\b/i, /\bbahasa indonesia\b/i]],
  ["Inggris", [/\binggris\b/i, /\benglish\b/i]],
  ["Mandarin", [/\bmandarin\b/i, /\bchinese\b/i, /中文/]],
  ["Jepang", [/\bjepang\b/i, /\bjapanese\b/i]],
  ["Korea", [/\bkorea\b/i, /\bkorean\b/i]],
  ["Arab", [/\barab(ic)?\b/i]],
  ["Jerman", [/\bjerman\b/i, /\bgerman\b/i, /\bdeutsch\b/i]],
  ["Prancis", [/\bprancis\b/i, /\bfrench\b/i]],
  ["Spanyol", [/\bspanyol\b/i, /\bspanish\b/i]],
  ["Belanda", [/\bbelanda\b/i, /\bdutch\b/i]],
  ["Melayu", [/\bmelayu\b/i, /\bmalay\b/i]],
  ["Vietnam", [/\bvietnam(?:ese)?\b/i]],
  ["Thai", [/\bthai\b/i]],
  ["Rusia", [/\brusia\b/i, /\brussian\b/i]],
  ["Hindi", [/\bhindi\b/i]],
  ["Jawa", [/\bjawa\b/i]],
  ["Sunda", [/\bsunda\b/i]],
];

const COUNTRY =
  "(?:indonesia|singapura|singapore|malaysia|jepang|japan|korea|australia|jerman|germany|belanda|netherlands|amerika|united states|usa|inggris|united kingdom|kanada|canada|uni emirat arab|uae|arab saudi|saudi arabia|thailand|vietnam|filipina|philippines|taiwan|hong ?kong|india)";

// "Jakarta, Indonesia" — sengaja mensyaratkan bentuk Kota, Negara supaya baris
// seperti "Bahasa: Indonesia (native), Inggris (profesional)" tidak ikut tertangkap.
const LOCATION_LINE = new RegExp(`^[^,\\n]{2,40},\\s*${COUNTRY}\\.?$`, "i");
const COUNTRY_ONLY_LINE = new RegExp(`^${COUNTRY}\\.?$`, "i");

const SECTION_WORDS =
  /^(about|summary|profile|ringkasan|pengalaman|experience|education|pendidikan|skills|keahlian|languages|bahasa|contact|kontak)\b/i;

const NOISE_LINE = /(@|https?:\/\/|www\.|\+?\d[\d\s()-]{7,})/;

function lines(text) {
  return (text ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function matchSkills(text) {
  return SKILLS.filter(([, patterns]) => patterns.some((pattern) => pattern.test(text))).map(
    ([name]) => name,
  );
}

function guessExperienceYears(text) {
  const explicit = text.match(
    /(\d{1,2})\s*\+?\s*(?:tahun|thn|years?|yrs?)\s*(?:of\s*)?(?:pengalaman|experience)/i,
  );
  if (explicit) {
    const value = Number.parseInt(explicit[1], 10);
    if (value > 0 && value <= 60) return String(value);
  }

  const currentYear = new Date().getFullYear();
  const ranges = [];
  const pattern =
    /\b(19\d{2}|20\d{2})\s*(?:-|–|—|to|sampai|hingga)\s*(19\d{2}|20\d{2}|sekarang|saat ini|present|now|current)\b/gi;

  for (const match of text.matchAll(pattern)) {
    const start = Number.parseInt(match[1], 10);
    const end = /^\d{4}$/.test(match[2]) ? Number.parseInt(match[2], 10) : currentYear;
    if (start >= 1970 && end >= start) ranges.push([start, Math.min(end, currentYear)]);
  }
  if (!ranges.length) return "";

  // Rentang yang tumpang tindih digabung supaya kerja paralel tidak dihitung dua kali.
  ranges.sort((a, b) => a[0] - b[0]);
  let [spanStart, spanEnd] = ranges[0];
  let total = 0;
  for (const [start, end] of ranges) {
    if (start > spanEnd) {
      total += spanEnd - spanStart;
      [spanStart, spanEnd] = [start, end];
    } else {
      spanEnd = Math.max(spanEnd, end);
    }
  }
  total += spanEnd - spanStart;

  return total > 0 && total <= 60 ? String(total) : "";
}

function guessLocation(allLines) {
  for (const line of allLines.slice(0, 12)) {
    if (NOISE_LINE.test(line) || line.length > 60 || SECTION_WORDS.test(line)) continue;
    if (LOCATION_LINE.test(line) || COUNTRY_ONLY_LINE.test(line)) return line.replace(/\.$/, "");
  }
  return "";
}

function guessEducation(allLines) {
  const candidates = allLines.filter((line) => line.length <= 120 && DEGREES.test(line));
  // Baris yang juga menyebut institusi lebih meyakinkan. Tanpa ini, judul seperti
  // "Dokter Spesialis Anak" bisa terbaca sebagai pendidikan.
  return candidates.find((line) => SCHOOLS.test(line)) ?? candidates[0] ?? "";
}

function guessLanguages(allLines) {
  let best = { line: "", count: 0 };
  for (const line of allLines) {
    if (line.length > 120) continue;
    const count = LANGUAGES.filter(([, patterns]) =>
      patterns.some((pattern) => pattern.test(line)),
    ).length;
    if (count > best.count) best = { line, count };
  }
  if (best.count >= 2) return best.line;

  const joined = allLines.join(" ");
  const names = LANGUAGES.filter(([, patterns]) =>
    patterns.some((pattern) => pattern.test(joined)),
  ).map(([name]) => name);
  return names.length ? names.join(", ") : "";
}

function guessHeadline(allLines) {
  for (const line of allLines.slice(0, 10)) {
    if (line.length > 70 || NOISE_LINE.test(line)) continue;
    if (ROLE_WORDS.test(line)) return line;
  }
  const first = allLines[0];
  return first && first.length <= 70 && !NOISE_LINE.test(first) ? first : "";
}

/**
 * Ambil field yang memang lazim ada di CV. Field yang tidak menghasilkan apa pun
 * dikembalikan sebagai string kosong, bukan tebakan.
 */
export function extractProfile(cvText) {
  const text = typeof cvText === "string" ? cvText : "";
  const allLines = lines(text);

  return {
    headline: guessHeadline(allLines),
    experienceYears: guessExperienceYears(text),
    location: guessLocation(allLines),
    education: guessEducation(allLines),
    languages: guessLanguages(allLines),
    skills: matchSkills(text).slice(0, 20).join(", "),
  };
}

/** Field yang bisa diisi dari CV, urut sesuai tampilan Settings. */
export const EXTRACTABLE_FIELDS = [
  "headline",
  "experienceYears",
  "location",
  "education",
  "languages",
  "skills",
];
