export function caseIdentifier(val) {
  const str = val.split(".")[0]

  if (/^[a-z]+$/.test(str)) return 'kebab';
  if (/^[a-z]+(-[a-z]+)+$/.test(str)) return 'kebab';
  if (/^[a-z]+(?:[A-Z][a-z]*)*$/.test(str)) return 'camel';
  if (/^[A-Z][a-z]+(?:[A-Z][a-z]*)*$/.test(str)) return 'pascal';

  return 'unknown';
}