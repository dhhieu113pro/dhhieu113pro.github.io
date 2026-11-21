'use strict';

// JS \b only knows ASCII word characters, so it cannot bound Vietnamese
// words like "vợ" or "phụ nữ". \p{L} with the u flag can.
function wholeWord(word) {
  return new RegExp(`(?:^|[^\\p{L}])${word}(?![\\p{L}])`, 'giu');
}

function countWord(text, word) {
  return (text.match(wholeWord(word)) || []).length;
}

const SELF = /(?:^|[^\p{L}])(?:tôi|mình)\s+(?:được\s+|đang\s+)?(?:là\s+)?(?:người\s+)?(phụ nữ|đàn ông|con gái|con trai)(?![\p{L}])/iu;

function detectGender(record, overrides = {}) {
  const override = overrides[record?.slug] || {};
  const text = (Array.isArray(record?.parts) ? record.parts : [])
    .filter((part) => part && part.kind !== 'begin')
    .map((part) => String(part.text || ''))
    .join(' ');

  let gender = 'M';
  const self = SELF.exec(text);
  if (self) {
    const noun = self[1].toLowerCase();
    gender = (noun === 'phụ nữ' || noun === 'con gái') ? 'F' : 'M';
  } else {
    const husbands = countWord(text, 'chồng');
    const wives = countWord(text, 'vợ');
    if (husbands > wives) gender = 'F';
    else if (wives > husbands) gender = 'M';
    else if (countWord(text, 'bạn trai')) gender = 'F';
    else if (countWord(text, 'bạn gái')) gender = 'M';
  }

  const chosen = (override.gender === 'F' || override.gender === 'M') ? override.gender : gender;
  return {
    gender: chosen,
    voice: override.voice || (chosen === 'F' ? 'doan_trang' : 'duc_tri'),
    source: (override.gender === 'F' || override.gender === 'M') ? 'override' : 'rule',
  };
}

module.exports = { detectGender };
