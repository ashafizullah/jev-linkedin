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
];

const DEGREES =
  /\b(s1|s2|s3|d3|d4|sarjana|magister|doktor|bachelor|master|phd|doctorate|diploma)\b/i;

const ROLE_WORDS =
  /\b(engineer|developer|programmer|designer|architect|analyst|scientist|manager|lead|head|consultant|specialist|administrator|devops|frontend|front-end|backend|back-end|full\s*stack|fullstack|data|product|marketing|sales|finance|accountant|teacher|guru|dosen|staff|supervisor|intern|magang)\b/i;

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

// "Batam, Indonesia" — sengaja mensyaratkan bentuk Kota, Negara supaya baris
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
  for (const line of allLines) {
    if (line.length > 120) continue;
    if (DEGREES.test(line)) return line;
  }
  return "";
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
