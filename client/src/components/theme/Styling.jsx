import { useDarkMode } from './DarkModeContext';

export default function Styling() {
  const { darkMode } = useDarkMode();

  return {
    themeTransition: 'transition-colors duration-300 ease-in-out',
    blueGradient: 'bg-gradient-to-r from-[#161647] to-[#1d1d63]',
    greenText: darkMode ? 'text-green-400' : 'text-green-700',
    orangeText: darkMode ? 'text-orange-400' : 'text-orange-600',
    greenBg: darkMode ? 'bg-green-700 text-white' : 'bg-green-700 text-white',
    dot: 'bg-transparent border-transparent hover:rounded-md transition cursor-pointer',

    // Complete profile form tokens
    profileErrorText: darkMode ? 'text-red-300' : 'text-red-700',
    profileErrorBg: darkMode ? 'bg-red-950/40' : 'bg-red-50',
    profileFocus: darkMode
      ? 'focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30'
      : 'focus:border-blue-600 focus:ring-2 focus:ring-blue-600/25',
    profileDisabled: darkMode
      ? 'disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-400'
      : 'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500',
    profileGhostButton: darkMode
      ? 'cursor-pointer rounded-lg border border-gray-600 bg-gray-800 text-gray-100 hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:opacity-50'
      : 'cursor-pointer rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50',
    profileSurfaceShadow: darkMode
      ? 'shadow-[0_8px_30px_rgba(0,0,0,0.4)]'
      : 'shadow-[0_8px_30px_rgba(15,23,42,0.08)]',
    profileInputBorder: darkMode
      ? 'border-gray-600 hover:border-gray-500'
      : 'border-gray-300 hover:border-gray-400',
    profileAvatarBg: darkMode ? 'bg-blue-950/50' : 'bg-blue-50',

    // Backgrounds (dark: secondary sits lighter than primary, like white on #FAFAFA in light)
    primaryBg: darkMode ? 'bg-[#171717]' : 'bg-[#FAFAFA]',
    secondaryBg: darkMode ? 'bg-[#202020]' : 'bg-[#FFFFFF]',
    sidebarCanvasBg: darkMode ? 'bg-[#090A0F]' : 'bg-[#F3F4FA]',
    sidebarBg: darkMode ? 'bg-[#12141B]' : 'bg-[#FAFAFD]',
    sidebarActiveBg: darkMode ? 'bg-[#242642]' : 'bg-[#E9E9FF]',
    sidebarText: darkMode ? 'text-[#E7E9F2]' : 'text-[#20243A]',
    sidebarMutedText: darkMode ? 'text-[#979DAF]' : 'text-[#646B80]',
    sidebarAccentText: darkMode ? 'text-[#C4C2FF]' : 'text-[#4F46E5]',
    sidebarAccentBg: darkMode ? 'bg-[#5549ED]' : 'bg-[#5146E8]',
    sidebarTextHover: darkMode ? 'hover:text-[#E7E9F2]' : 'hover:text-[#20243A]',
    sidebarMutedHover: darkMode ? 'hover:text-[#979DAF]' : 'hover:text-[#646B80]',
    sidebarActiveHover: darkMode ? 'hover:bg-[#242642]' : 'hover:bg-[#E9E9FF]',
    sidebarIndicatorRing: darkMode ? 'ring-[#12141B]' : 'ring-[#FAFAFD]',
    notebookCardTones: darkMode
      ? [
          'bg-gradient-to-br from-[#1d302d] via-[#1b2725] to-[#202020]',
          'bg-gradient-to-br from-[#202a50] via-[#1b2138] to-[#202020]',
          'bg-gradient-to-br from-[#30253c] via-[#261f31] to-[#202020]',
          'bg-gradient-to-br from-[#332c1e] via-[#29251e] to-[#202020]',
        ]
      : [
          'bg-gradient-to-br from-emerald-50 via-emerald-100 to-white',
          'bg-gradient-to-br from-blue-50 via-indigo-100 to-white',
          'bg-gradient-to-br from-purple-50 via-violet-100 to-white',
          'bg-gradient-to-br from-amber-50 via-yellow-100 to-white',
        ],
    notebookAccentTones: darkMode
      ? [
          { text: 'text-emerald-400', line: 'bg-emerald-400' },
          { text: 'text-blue-400', line: 'bg-blue-400' },
          { text: 'text-violet-400', line: 'bg-violet-400' },
          { text: 'text-amber-400', line: 'bg-amber-400' },
        ]
      : [
          { text: 'text-emerald-700', line: 'bg-emerald-500' },
          { text: 'text-blue-700', line: 'bg-blue-500' },
          { text: 'text-violet-700', line: 'bg-violet-500' },
          { text: 'text-amber-700', line: 'bg-amber-500' },
        ],
    streakIconBg: darkMode ? 'bg-orange-950/60' : 'bg-orange-100',
    streakIconText: darkMode ? 'text-orange-400' : 'text-orange-600',
    headerBg: darkMode
      ? 'bg-[#121212]/70 backdrop-blur-xl border-b border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
      : 'bg-white/70 backdrop-blur-xl border-b border-black/5 shadow-[0_8px_32px_rgba(15,23,42,0.08)]',
    headerNavText: darkMode
      ? 'text-gray-300 hover:text-blue-400'
      : 'text-gray-600 hover:text-blue-700',

    // Borders / dividers
    border: darkMode ? 'border-[#3A3A3A]' : 'border-[#E0E0E0]',
    divide: darkMode ? 'divide-[#3A3A3A]' : 'divide-[#E0E0E0]',

    // Hovers
    primaryBgHover: darkMode ? 'hover:bg-[#1f1f1f]' : 'hover:bg-[#f0f0f0]',
    secondaryBgHover: darkMode ? 'hover:bg-[#2a2a2a] cursor-pointer' : 'hover:bg-[#f5f5f5] cursor-pointer',
    headerHover: darkMode ? 'hover:bg-[#2e2e2e]' : 'hover:bg-[#f0f0f0]',

    // Inputs
    input: darkMode
      ? 'focus:outline-none focus:ring-0 focus:border-blue-400 bg-[#292929] border-[#4A4A4A] text-[#E0E0E0] placeholder:text-[#8A8A8A]'
      : 'focus:outline-none focus:ring-0 focus:border-blue-600 bg-[#FAFAFA] border-[#BDBDBD] text-[#333333] placeholder:text-[#707070]',
    dotTheme: darkMode
      ? 'text-[#C9C9C9] hover:bg-[#3C3C3C]'
      : 'text-[#333333] hover:bg-gray-200',

    // Text
    primaryText: darkMode ? 'text-[#E8E8E8]' : 'text-[#262626]',
    secondaryText: darkMode ? 'text-[#B0B0B0]' : 'text-[#595959]',
    tertiaryText: darkMode ? 'text-[#8F8F8F]' : 'text-[#707070]',
    primaryTextHover: darkMode ? 'hover:text-white' : 'hover:text-gray-900',

    // Tabs
    tabHover: darkMode
      ? 'hover:bg-blue-500/15 text-gray-100'
      : 'hover:bg-blue-100 text-gray-700',
    activeTab: darkMode
      ? 'font-semibold border-b-2 border-blue-400 bg-blue-500/15 text-blue-200'
      : 'font-semibold border-b-2 border-blue-600 bg-blue-100 text-blue-800',

    stepTrack: darkMode ? 'bg-gray-700' : 'bg-gray-300',
    stepProgress: darkMode ? 'bg-blue-500' : 'bg-blue-600',
    stepComplete: darkMode
      ? 'border-blue-700 bg-blue-700 text-white'
      : 'border-blue-600 bg-blue-600 text-white',
    stepCurrent: darkMode
      ? 'border-blue-500 bg-blue-600 text-white ring-4 ring-blue-400/30'
      : 'border-blue-600 bg-blue-600 text-white ring-4 ring-blue-600/25',
    stepUpcoming: darkMode
      ? 'border-gray-700 bg-gray-700 text-gray-300'
      : 'border-gray-300 bg-gray-300 text-gray-700',
    stepLabel: darkMode ? 'text-gray-400' : 'text-gray-600',
    stepLabelActive: darkMode ? 'text-gray-100' : 'text-gray-900',

    // Buttons (light: 600 -> 700 on hover; dark: 700 -> 600 on hover; all keep white text >= 4.5:1)
    buttonBlue: `cursor-pointer disabled:cursor-not-allowed text-white disabled:opacity-50 ${darkMode ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'}`,
    buttonGreen: `cursor-pointer disabled:cursor-not-allowed text-white disabled:opacity-50 ${darkMode ? 'bg-green-700 hover:bg-green-600' : 'bg-green-700 hover:bg-green-800'}`,
    buttonRed: `cursor-pointer disabled:cursor-not-allowed text-white disabled:opacity-50 ${darkMode ? 'bg-red-700 hover:bg-red-600' : 'bg-red-600 hover:bg-red-700'}`,
    buttonGray: darkMode
      ? 'cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed bg-gray-700 hover:bg-gray-600 text-gray-100'
      : 'cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed bg-gray-200 hover:bg-gray-300 text-gray-700 hover:text-gray-900',
    buttonFrost: darkMode
      ? 'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 border border-white/10 bg-white/5 text-gray-100 shadow-sm backdrop-blur-xl transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400'
      : 'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 border border-black/[0.06] bg-white/70 text-gray-700 shadow-sm backdrop-blur-xl transition-all duration-200 hover:border-black/[0.10] hover:bg-white hover:shadow-md active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
    // Primary: solid counterpart to buttonFrost (same transition, press scale, focus ring, soft edge)
    buttonPrimary: darkMode
      ? 'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 border border-white/10 bg-blue-700 text-white transition-all duration-200 hover:bg-blue-600 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400'
      : 'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 border border-blue-800/20 bg-blue-600 text-white transition-all duration-200 hover:bg-blue-700 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
    // Danger/delete: flat red counterpart to buttonPrimary, same border, transition, press scale and focus ring
    buttonDanger: darkMode
      ? 'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 border border-white/10 bg-red-700 text-white transition-all duration-200 hover:bg-red-600 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400'
      : 'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 border border-red-800/20 bg-red-600 text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600',
    buttonPurple: `cursor-pointer disabled:cursor-not-allowed text-white disabled:opacity-60 ${darkMode ? 'bg-purple-700 hover:bg-purple-600' : 'bg-purple-600 hover:bg-purple-700'}`,
    // Yellow needs dark text; white on yellow fails contrast in both modes
    buttonYellow: `cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 text-gray-900 ${darkMode ? 'bg-yellow-500 hover:bg-yellow-400' : 'bg-yellow-400 hover:bg-yellow-500'}`,
    buttonOrange: `cursor-pointer disabled:cursor-not-allowed text-white disabled:opacity-60 ${darkMode ? 'bg-orange-700 hover:bg-orange-600' : 'bg-orange-600 hover:bg-orange-700'}`,
    closeButton: darkMode
      ? 'font-extrabold cursor-pointer text-gray-400 hover:text-red-400'
      : 'font-extrabold cursor-pointer text-gray-500 hover:text-red-600',

    // Colored backgrounds (tinted surfaces: dark /20, light 100-200)
    yellowBg: darkMode ? 'bg-yellow-500/20' : 'bg-yellow-100',
    yellowBg2: darkMode ? 'bg-yellow-500/15' : 'bg-yellow-200/50',
    redBg: darkMode ? 'bg-red-700 text-white' : 'bg-red-600 text-white',
    redBg2: darkMode ? 'bg-red-500/20' : 'bg-red-200/50',
    blueBg: darkMode ? 'bg-blue-500/20' : 'bg-blue-100',
    blueBg2: darkMode ? 'bg-blue-500/20' : 'bg-blue-200/50',
    greenBg2: darkMode ? 'bg-green-500/20' : 'bg-green-200/50',
    grayBg: darkMode ? 'bg-[#242526]/90' : 'bg-gray-100',
    grayBg2: darkMode ? 'bg-gray-500/10' : 'bg-gray-200/50',
    purpleBg2: darkMode ? 'bg-purple-500/20' : 'bg-purple-200/50',

    shadow: darkMode
      ? 'shadow-[0_2px_6px_rgba(0,0,0,0.5)]'
      : 'shadow-[0_2px_6px_rgba(0,0,0,0.12)]',

    // Hover states are always one step stronger than the resting tint
    blueBg2hover: darkMode
      ? 'hover:bg-blue-500/30 hover:border-blue-500/50 cursor-pointer'
      : 'hover:bg-blue-200/80 hover:border-blue-400 cursor-pointer',
    purpleBg2hover: darkMode
      ? 'hover:bg-purple-500/30 hover:border-purple-500/50 cursor-pointer'
      : 'hover:bg-purple-200/80 hover:border-purple-400 cursor-pointer',
    redBg2Hover: darkMode
      ? 'hover:bg-red-500/30 hover:border-red-500/50 cursor-pointer'
      : 'hover:bg-red-200/80 hover:border-red-400 cursor-pointer',
    greenBg2Hover: darkMode
      ? 'hover:bg-green-500/30 hover:border-green-500/50 cursor-pointer'
      : 'hover:bg-green-200/80 hover:border-green-400 cursor-pointer',

    gamingBg: darkMode
      ? 'bg-gradient-to-r from-purple-700 via-blue-700 to-slate-900'
      : 'bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-500',

    // Text colors (dark: 300-400 for contrast on dark surfaces, light: 600-700)
    yellowText: darkMode ? 'text-yellow-300' : 'text-yellow-800',
    redText: darkMode ? 'text-red-400' : 'text-red-700',
    blueText: darkMode ? 'text-blue-400' : 'text-blue-700',
    grayText: darkMode ? 'text-gray-400' : 'text-gray-600',
    purpleText: darkMode ? 'text-purple-300' : 'text-purple-700',

    // Border colors
    yellowBorder: darkMode ? 'border-yellow-500/40' : 'border-yellow-400',
    redBorder: darkMode ? 'border-red-500/40' : 'border-red-300',
    blueBorder: darkMode ? 'border-blue-500/40' : 'border-blue-300',
    greenBorder: darkMode ? 'border-green-500/40' : 'border-green-300',
    grayBorder: darkMode ? 'border-gray-600' : 'border-gray-300',
    purpleBorder: darkMode ? 'border-purple-500/40' : 'border-purple-300',

    // Answers
    correct: darkMode
      ? 'bg-green-500/25 text-green-100'
      : 'bg-green-100 text-green-900',
    wrong: darkMode
      ? 'bg-red-500/25 text-red-100'
      : 'bg-red-100 text-red-900',
    correctText: darkMode ? 'text-green-300' : 'text-green-800',

    // Study tools
    studyMutedText: darkMode ? 'text-[#AEB7C6]' : 'text-[#596273]',
    studyPlaceholder: darkMode
      ? 'placeholder:text-[#AEB7C6]'
      : 'placeholder:text-[#596273]',
    studyAccent: darkMode ? 'accent-blue-400' : 'accent-blue-700',
    studyFocusRing: darkMode
      ? 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400'
      : 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700',
    studyInput: darkMode
      ? 'border-[#4A4A4A] bg-[#292929] text-[#E0E0E0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400'
      : 'border-[#BDBDBD] bg-[#FAFAFA] text-[#333333] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700',
    studyOverlayStyle: {
      backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.64)' : 'rgba(15, 23, 42, 0.28)',
    },
    studyCheckbox: darkMode ? 'border-gray-500' : 'border-gray-400',
    studyPrimaryButton: darkMode
      ? 'cursor-pointer border border-transparent bg-blue-700 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-300'
      : 'cursor-pointer border border-transparent bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-gray-400 disabled:bg-gray-200 disabled:text-gray-700',
    studyGhostButton: darkMode
      ? 'cursor-pointer rounded-lg border border-gray-600 bg-gray-800 text-gray-100 hover:bg-gray-700 disabled:cursor-not-allowed disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-300'
      : 'cursor-pointer rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:border-gray-400 disabled:bg-gray-200 disabled:text-gray-700',
    studyDangerButton: darkMode
      ? 'cursor-pointer rounded-lg bg-red-700 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-300'
      : 'cursor-pointer rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-700',
    studySelected: darkMode
      ? 'border-blue-400 bg-[#1D2D4D] text-[#EAF2FF]'
      : 'border-blue-700 bg-blue-50 text-blue-950',
    studyTabActive: darkMode
      ? 'border-b-2 border-blue-400 text-gray-100'
      : 'border-b-2 border-blue-700 text-gray-900',
    studySuccess: darkMode
      ? 'border-green-600 bg-green-950/40 text-green-200'
      : 'border-green-700 bg-green-50 text-green-800',
    studyInfo: darkMode
      ? 'border-blue-600 bg-blue-950/40 text-blue-200'
      : 'border-blue-700 bg-blue-50 text-blue-800',
    studyDanger: darkMode
      ? 'border-red-600 bg-red-950/40 text-red-200'
      : 'border-red-700 bg-red-50 text-red-800',
    studyDisabled: darkMode
      ? 'disabled:cursor-not-allowed disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-300'
      : 'disabled:cursor-not-allowed disabled:border-gray-400 disabled:bg-gray-200 disabled:text-gray-700',

    // Misc
    blueHover: darkMode ? 'hover:bg-blue-500/15' : 'hover:bg-blue-50',
    navBg: darkMode
      ? 'bg-gray-800 hover:bg-gray-700 text-gray-100'
      : 'bg-gray-200 hover:bg-gray-300 text-gray-700',
  };
}