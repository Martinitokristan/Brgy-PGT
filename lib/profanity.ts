type ProfanityMatch = {
  matched: string[];
};

function normalize(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[_*~`^]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// NOTE: Keep this list focused on common profanity. Avoid false positives.
// Word-boundary matching is used so partial words don't trigger.
const BANNED_WORDS = [
  // English
  "fuck", "fck", "shit", "bitch", "asshole", "motherfucker", "mf", "fuckyou",
  // Tagalog
  "puta", "potangina", "potang ina", "tangina", "tang ina", "gago", "ulol", "tarantado", "punyeta",
  // Bisaya/Cebuano
  "yawa", "piste", "buang", "animal", "atay", "bwesit", "bwisit", "bulok", "buang ka",
];

// Build a regex that matches any banned token at word boundaries.
// We allow spaces inside some phrases by normalizing whitespace and including the phrase as-is.
const bannedRegex = new RegExp(
  `\\b(${BANNED_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "gi"
);

export function detectProfanity(text: string | null | undefined): ProfanityMatch | null {
  if (!text) return null;
  const normalized = normalize(text);
  if (!normalized) return null;

  const matched = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = bannedRegex.exec(normalized)) !== null) {
    matched.add(m[1]);
    if (matched.size >= 5) break; // cap
  }

  if (matched.size === 0) return null;
  return { matched: Array.from(matched) };
}

