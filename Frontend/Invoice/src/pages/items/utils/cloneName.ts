const CLONE_SUFFIX_REGEX = /\s+\(Clone(?:\s+\d+)?\)$/i;

const normalizeName = (value: string, fallback: string) => {
  const trimmed = String(value || "").trim();
  return trimmed || fallback;
};

export const buildCloneName = (
  sourceName: string,
  existingNames: string[],
  fallbackName = "Item"
) => {
  const fallback = normalizeName(fallbackName, "Item");
  const normalizedSource = normalizeName(sourceName, fallback);
  const baseName = normalizedSource.replace(CLONE_SUFFIX_REGEX, "").trim() || fallback;
  const normalizedExisting = new Set(
    existingNames
      .map((name) => String(name || "").trim().toLowerCase())
      .filter(Boolean)
  );

  const firstCandidate = `${baseName} (Clone)`;
  if (!normalizedExisting.has(firstCandidate.toLowerCase())) {
    return firstCandidate;
  }

  let index = 2;
  while (normalizedExisting.has(`${baseName} (Clone ${index})`.toLowerCase())) {
    index += 1;
  }

  return `${baseName} (Clone ${index})`;
};

