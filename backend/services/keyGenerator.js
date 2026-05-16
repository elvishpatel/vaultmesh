import crypto from 'crypto';

export function generateRetrievalKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let key = 'VM-';
  for (let i = 0; i < 4; i++) key += chars[crypto.randomInt(chars.length)];
  key += '-';
  for (let i = 0; i < 4; i++) key += chars[crypto.randomInt(chars.length)];
  return key;
}

export function generateDecoyKeys(realKey, count = 5) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const decoys = new Set([realKey]);
  const parts = realKey.split('-');
  const editableChars = parts[1] + parts[2];

  let attempts = 0;
  while (decoys.size < count && attempts < 100) {
    attempts++;
    const numChanges = Math.random() < 0.5 ? 1 : 2;
    const charArray = editableChars.split('');
    const positions = new Set();
    while (positions.size < numChanges) positions.add(crypto.randomInt(charArray.length));
    for (const pos of positions) {
      let c;
      do { c = chars[crypto.randomInt(chars.length)]; } while (c === charArray[pos]);
      charArray[pos] = c;
    }
    decoys.add(`VM-${charArray.slice(0, 4).join('')}-${charArray.slice(4).join('')}`);
  }

  const result = Array.from(decoys);
  for (let i = result.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function isValidKeyFormat(key) {
  return /^VM-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(key);
}
