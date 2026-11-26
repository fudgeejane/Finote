function uniqueName(name, existingNames, maxLength) {
  const usedNames = new Set(
    existingNames.map((existingName) => existingName.trim().toLocaleLowerCase())
  );
  const normalizedName = name.trim();
  if (!usedNames.has(normalizedName.toLocaleLowerCase())) return normalizedName;

  for (let suffixNumber = 1; ; suffixNumber += 1) {
    const suffix = `(${suffixNumber})`;
    const prefix = normalizedName.slice(0, maxLength - suffix.length).trimEnd();
    const candidate = `${prefix}${suffix}`;
    if (!usedNames.has(candidate.toLocaleLowerCase())) return candidate;
  }
}

module.exports = uniqueName;
