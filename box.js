// box.js

function getStringWidth(str) {
  let width = 0;
  for (const char of str) {
    const code = char.codePointAt(0);
    width += (code > 0x1100 && (
      code <= 0x115f || code === 0x2329 || code === 0x232a ||
      (0x2e80 <= code && code <= 0xa4cf && code !== 0x303f) ||
      (0xac00 <= code && code <= 0xd7a3) ||
      (0xf900 <= code && code <= 0xfaff) ||
      (0xfe10 <= code && code <= 0xfe19) ||
      (0xfe30 <= code && code <= 0xfe6f) ||
      (0xff00 <= code && code <= 0xff60) ||
      (0xffe0 <= code && code <= 0xffe6))) ? 2 : 1;
  }
  return width;
}

function ansiColor(color) {
  const [r, g, b] = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
  return `\x1b[38;2;${r};${g};${b}m`;
}

function interpolateColor(color1, color2, factor) {
  const c1 = color1.slice(1).match(/.{2}/g).map((hex) => parseInt(hex, 16));
  const c2 = color2.slice(1).match(/.{2}/g).map((hex) => parseInt(hex, 16));
  return `#${c1.map((c, i) => Math.round(c + factor * (c2[i] - c)).toString(16).padStart(2, '0')).join('')}`;
}

const resetColor = '\x1b[0m';

function boxCreate(messages, colors, isGradient, textColors = [], isTextGradient = false) {
  const defaultSpace = 2;
  const tips = [" ", ...[].concat(messages).flatMap(msg => msg.split("\n")), " "]
    .map((val) => ({ val, len: getStringWidth(val) }));
  const maxLen = tips.reduce((len, tip) => Math.max(len, tip.len), 0) + getStringWidth(" ") * 2 * defaultSpace;

  const paddedTips = tips.map(({ val, len }) => {
    const totalPadding = maxLen - len;
    const leftPadding = Math.floor(totalPadding / 2);
    const rightPadding = totalPadding - leftPadding;
    return " ".repeat(leftPadding) + val + " ".repeat(rightPadding);
  });

  const steps = maxLen;
  const segmentLength = steps / (colors.length - 1);
  const gradientLine = [...Array(steps).keys()].map(i => {
    const [c1, c2] = [colors[Math.floor(i / segmentLength)], colors[Math.floor(i / segmentLength) + 1] || colors[0]];
    return ansiColor(interpolateColor(c1, c2, (i % segmentLength) / segmentLength)) + '─' + resetColor;
  }).join('');

  function applyTextGradient(msg, colors) {
    const steps = getStringWidth(msg);
    const segmentLength = steps / (colors.length - 1);
    return msg.split('').map((char, i) => {
      const [c1, c2] = [colors[Math.floor(i / segmentLength)], colors[Math.floor(i / segmentLength) + 1] || colors[0]];
      return ansiColor(interpolateColor(c1, c2, (i % segmentLength) / segmentLength)) + char + resetColor;
    }).join('');
  }

  const textLineColor = (msg) => (isTextGradient && textColors.length) ? applyTextGradient(msg, textColors) :
    (textColors.length ? ansiColor(textColors[0]) + msg + resetColor : msg);

  console.log(ansiColor(colors[0]) + `┌` + gradientLine + ansiColor(colors[colors.length - 1]) + `┐`);
  paddedTips.forEach(msg => console.log(ansiColor(colors[0]) + `│` + textLineColor(msg) + ansiColor(colors[colors.length - 1]) + `│`));
  console.log(ansiColor(colors[0]) + `└` + gradientLine + ansiColor(colors[colors.length - 1]) + `┘`);
}

module.exports = { boxCreate };
