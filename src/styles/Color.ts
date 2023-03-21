// Should match tailwind.config.js
export enum Color {
  primaryBlack = '#010101',
  primaryWhite = '#FFFFFF',
  primaryGray = '#afafaf',
  lightGray = '#D0D4DB',
  primaryBlue = '#025AA1',
  primaryBeige = '#F1EDE9',
  primaryRed = '#BF1B15',
  primaryYellow = '#e2b972',
  darkYellow = '#d79e3b',
  lightYellow = '#edd5a8',
  primaryBluish = '#292659',
}

// Useful for cases when using class names isn't convenient
// such as in svg fills        yellow: {

export function classNameToColor(className) {
  switch (className) {
    case 'bg-blue-500':
      return Color.primaryBlue;
    case 'bg-red-500':
      return Color.primaryRed;
    case 'bg-gray-500':
      return Color.primaryGray;
    case 'bg-yellow-500':
      return Color.primaryYellow;
    default:
      throw new Error('Missing color for className: ' + className);
  }
}
