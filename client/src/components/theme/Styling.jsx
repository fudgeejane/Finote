import { useDarkMode } from './DarkModeContext';

// Shared button base so it isn't repeated everywhere
const btnBase = 'cursor-pointer disabled:cursor-not-allowed text-white';

// Same in both modes: written once, spread into both
const shared = {
  blueGradient: 'bg-gradient-to-r from-[#161647] to-[#1d1d63]',
  greenText: 'text-green-500',
  orangeText: 'text-orange-400',
  greenBg: 'bg-green-600 text-white',
  dot: 'bg-transparent border-transparent hover:rounded-md transition cursor-pointer',
};

const lightStyles = {
  ...shared,

  // Backgrounds
  primaryBg: 'bg-[#F3f3f3]',
  secondaryBg: 'bg-[#FFFFFF]',
  headerBg:
    'bg-white/20 backdrop-blur-xl border-b border-black/5 shadow-[0_8px_32px_rgba(15,23,42,0.08)]',
  headerNavText: 'text-gray-600 hover:text-blue-700',

  // Borders / dividers
  border: 'border-[#CCCCCC]',
  divide: 'divide-[#CCCCCC]',

  // Hovers
  primaryBgHover: 'hover:bg-[#f0f0f0]',
  secondaryBgHover: 'hover:bg-[#f5f5f5]',
  headerHover: 'hover:bg-[#f5f5f5]',

  // Inputs
  input: 'focus:outline-none focus:ring-0 bg-[#FAFAFA] border-[#DDDDDD] text-[#333333]',
  dotTheme: 'text-[#333333] hover:bg-gray-200',

  // Text
  primaryText: 'text-[#333333]',
  secondaryText: 'text-[#666666]',
  tertiaryText: 'text-[#999999]',
  primaryTextHover: 'hover:text-gray-800',

  // Tabs
  tabHover: 'hover:bg-blue-100 text-gray-700',
  activeTab: 'font-semibold border-b-2 border-blue-600 bg-blue-200/70 text-blue-700',

  // Buttons
  buttonBlue: `${btnBase} disabled:opacity-50 bg-blue-600 hover:bg-blue-500`,
  buttonGreen: `${btnBase} disabled:opacity-50 bg-green-600 hover:bg-green-500`,
  buttonRed: `${btnBase} disabled:opacity-50 bg-red-500 hover:bg-red-400`,
  buttonGray:
    'cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800',
  buttonFrost:
    'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50  border border-gray-200/70 bg-white/40 text-gray-700 shadow-sm backdrop-blur-xl transition hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
  buttonPurple: `${btnBase} disabled:opacity-80 bg-purple-600 hover:bg-purple-500`,
  buttonYellow: `${btnBase} disabled:opacity-80 bg-yellow-500 hover:bg-yellow-400`,
  buttonOrange: `${btnBase} disabled:opacity-80 bg-orange-400 hover:bg-orange-500`,
  closeButton: 'font-extrabold cursor-pointer text-gray-400 hover:text-red-500',

  // Colored backgrounds
  yellowBg: 'bg-yellow-100',
  yellowBg2: 'bg-yellow-200/50',
  redBg: 'bg-red-400 text-white',
  redBg2: 'bg-red-200/50',
  blueBg: 'bg-blue-500',
  blueBg2: 'bg-blue-200/50',
  greenBg2: 'bg-green-200/50',
  grayBg: 'bg-gray-100',
  grayBg2: 'bg-gray-200/50',
  purpleBg2: 'bg-purple-200/50',

  shadow: 'shadow-[0_2px_6px_rgba(0,0,0,0.15)]',

  blueBg2hover: 'hover:bg-blue-200/50 hover:border-blue-300',
  purpleBg2hover: 'hover:bg-purple-200/50 hover:border-purple-300',

  gamingBg: 'bg-gradient-to-r from-purple-400 via-blue-400 to-white',

  // Text colors
  yellowText: 'text-yellow-700',
  redText: 'text-red-700',
  blueText: 'text-blue-600',
  grayText: 'text-gray-600',
  purpleText: 'text-purple-600',

  // Border colors
  yellowBorder: 'border-yellow-400',
  redBorder: 'border-red-400',
  blueBorder: 'border-blue-500',
  greenBorder: 'border-green-300',
  grayBorder: 'border-gray-300',
  purpleBorder: 'border-purple-300',

  // Answers
  correct: 'bg-green-200/50 text-gray-600',
  wrong: 'bg-red-200/50',
  correctText: 'text-green-700',

  // Misc
  blueHover: 'hover:bg-blue-50',
  navBg: 'bg-gray-200 hover:bg-gray-300 text-gray-600',
};

const darkStyles = {
  ...shared,

  // Backgrounds
  primaryBg: 'bg-[#1c1c1c]',
  secondaryBg: 'bg-[#1E1E1E]',
  headerBg:
    'bg-[#121212]/20 backdrop-blur-xl border-b border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
  headerNavText: 'text-gray-300 hover:text-blue-400',

  // Borders / dividers
  border: 'border-[#333333]',
  divide: 'divide-[#333333]',

  // Hovers
  primaryBgHover: 'hover:bg-[#1a1a1a]',
  secondaryBgHover: 'hover:bg-[#292929]',
  headerHover: 'hover:bg-[#2e2e2e]',

  // Inputs
  input: 'focus:outline-none focus:ring-0 bg-[#292929] border-[#3C3C3C] text-[#C9C9C9]',
  dotTheme: 'text-[#C9C9C9] hover:bg-[#3C3C3C]',

  // Text
  primaryText: 'text-[#E0E0E0]',
  secondaryText: 'text-[#B0B0B0]',
  tertiaryText: 'text-[#8A8A8A]',
  primaryTextHover: 'hover:text-white',

  // Tabs
  tabHover: 'hover:bg-gray-700 text-gray-100',
  activeTab: 'font-semibold border-b-2 border-blue-400 bg-gray-800 text-gray-100',

  // Buttons
  buttonBlue: `${btnBase} disabled:opacity-50 bg-blue-700 hover:bg-blue-800`,
  buttonGreen: `${btnBase} disabled:opacity-50 bg-green-700 hover:bg-green-800`,
  buttonRed: `${btnBase} disabled:opacity-50 bg-red-700 hover:bg-red-800`,
  buttonGray:
    'cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed bg-gray-600 hover:bg-gray-700 text-white',
  buttonFrost:
    'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 border border-white/15 bg-white/5 text-gray-100 shadow-sm backdrop-blur-xl transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400',
  buttonPurple: `${btnBase} disabled:opacity-80 bg-purple-600 hover:bg-purple-700`,
  buttonYellow: `${btnBase} disabled:opacity-80 bg-yellow-600 hover:bg-yellow-700`,
  buttonOrange: `${btnBase} disabled:opacity-80 bg-orange-600 hover:bg-orange-700`,
  closeButton: 'font-extrabold cursor-pointer text-gray-400 hover:text-red-400',

  // Colored backgrounds
  yellowBg: 'bg-yellow-700/30',
  yellowBg2: 'bg-yellow-500/20',
  redBg: 'bg-red-600 text-white',
  redBg2: 'bg-red-500/20',
  blueBg: 'bg-blue-500/20',
  blueBg2: 'bg-blue-500/20',
  greenBg2: 'bg-green-500/20',
  grayBg: 'bg-[#242526]/90',
  grayBg2: 'bg-gray-500/10',
  purpleBg2: 'bg-purple-500/10',

  shadow: 'shadow-[0_2px_6px_rgba(60,60,60,0.45)]',

  blueBg2hover: 'hover:bg-blue-500/10 hover:border-blue-900',
  purpleBg2hover: 'hover:bg-purple-500/10 hover:border-purple-900',

  gamingBg: 'bg-gradient-to-r from-purple-700 via-blue-700 to-black/20',

  // Text colors
  yellowText: 'text-yellow-100',
  redText: 'text-red-500',
  blueText: 'text-blue-500',
  grayText: 'text-gray-500',
  purpleText: 'text-purple-400',

  // Border colors
  yellowBorder: 'border-yellow-900',
  redBorder: 'border-red-900',
  blueBorder: 'border-blue-700/30',
  greenBorder: 'border-green-700/30',
  grayBorder: 'border-gray-500',
  purpleBorder: 'border-purple-900',

  // Answers
  correct: 'bg-green-400/50 text-white',
  wrong: 'bg-red-400/70 text-white',
  correctText: 'text-green-200',

  // Misc
  blueHover: 'hover:bg-blue-800/50',
  navBg: 'bg-gray-800 hover:bg-gray-700 text-white',
};

export default function Styling() {
  const { darkMode } = useDarkMode();
  return darkMode ? darkStyles : lightStyles;
}