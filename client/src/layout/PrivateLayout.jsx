import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  ChevronDown,
  Home,
  LogOut,
  Moon,
  Search,
  Settings,
  Sun,
  X,
} from "lucide-react";
import Styling from "../components/theme/Styling";
import BreadCrumbs from "../components/ui/BreadCrumbs";
import { useAuth } from "../auth/AuthContext";
import { useDarkMode } from "../components/theme/DarkModeContext";
import Logo from "../../../public/Finote.png";

const navigation = [
  { label: "Home", to: "/home", icon: Home },
  { label: "My Schedule", to: "/schedule", icon: Calendar },
  { label: "Study Tools", to: "/study-tools", icon: BookOpen },
  { label: "Learning Progress", to: "/progress", icon: BarChart3 },
  { label: "Settings", to: "/settings", icon: Settings },

];


const searchItems = [
  { label: "Home", to: "/home", description: "Your study dashboard" },
  {
    label: "My Schedule",
    to: "/schedule",
    description: "View and manage your weekly classes",
  },
  {
    label: "My Notes",
    to: "/notes",
    description: "Create and find your notes",
  },
  {
    label: "Study Tools",
    to: "/study-tools",
    description: "Flashcards and mock exams",
  },
  {
    label: "Flashcards",
    to: "/study-tools",
    state: { tab: "flashcards" },
    description: "Review with flashcards",
  },
  {
    label: "Mock Exams",
    to: "/study-tools",
    state: { tab: "mock-exams" },
    description: "Prepare with a mock exam",
  },
  {
    label: "Learning Progress",
    to: "/progress",
    description: "Review your learning progress",
  },
  {
    label: "Settings",
    to: "/settings",
    description: "Manage your profile and account",
  },
];

export default function PrivateLayout() {
  const styles = Styling();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef(null);
  const searchTriggerRef = useRef(null);
  const profileMenuRef = useRef(null);
  const notificationsRef = useRef(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setNotificationsOpen(false);
      setProfileMenuOpen(false);
      setSearchOpen(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [location.pathname]);

  useEffect(() => {
    const closeMenusOnOutsideClick = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setProfileMenuOpen(false);
      }
      if (!notificationsRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", closeMenusOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeMenusOnOutsideClick);
  }, []);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        if (searchOpen) {
          setSearchOpen(false);
          searchTriggerRef.current?.focus();
        }
        setProfileMenuOpen(false);
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [searchOpen]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const openSearchShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchQuery("");
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", openSearchShortcut);
    return () => window.removeEventListener("keydown", openSearchShortcut);
  }, []);

  const headerLinkClass = ({ isActive }) =>
    `flex px-4 py-2.5 items-center gap-2  px-3 text-xs font-medium whitespace-nowrap transition-colors duration-200 ${
      isActive
        ? `${styles.blueBg2} ${styles.blueText}`
        : `${styles.sidebarText} ${styles.secondaryBgHover} ${styles.sidebarTextHover}`
    }`;
  const filteredSearchItems = searchItems.filter(({ label, description }) =>
    `${label} ${description}`
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase()),
  );
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Account";

  return (
     <div className={`flex min-h-dvh flex-col ${styles.primaryBg} ${styles.primaryText} ${styles.themeTransition}`}>
      <header className={`sticky top-0 z-40 border-b ${styles.headerBg} ${styles.border} ${styles.themeTransition}`}>
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 ">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <Link to="/home" className="flex shrink-0 items-center gap-2">
              <img src={Logo} alt="" className="h-8 w-8 object-contain" />
              <span className={`hidden font-serif text-lg font-semibold italic sm:inline ${styles.sidebarText}`}>
                Finote
              </span>
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              ref={searchTriggerRef}
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSearchOpen(true);
              }}
              aria-label="Search workspace"
              className={`flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full border sm:w-52 sm:justify-start sm:px-3 md:w-60 ${styles.border} ${styles.secondaryBg} ${styles.sidebarMutedText} ${styles.sidebarTextHover} ${styles.themeTransition}`}
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="hidden min-w-0 flex-1 truncate text-left text-xs sm:inline">
                Search workspace
              </span>
              <kbd className={`hidden shrink-0 rounded border px-1.5 py-0.5 text-[9px] lg:inline-flex ${styles.border} ${styles.sidebarMutedText}`}>
                Ctrl K
              </kbd>
            </button>

            <div ref={notificationsRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((open) => !open);
                  setProfileMenuOpen(false);
                }}
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                aria-controls="notifications-panel"
                className={`relative flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${styles.border} ${styles.secondaryBg} ${styles.secondaryBgHover}`}
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
              </button>
              {notificationsOpen && (
                <div
                  id="notifications-panel"
                  role="dialog"
                  aria-label="Notifications"
                  className={`absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-lg border p-4 shadow-xl ${styles.border} ${styles.secondaryBg}`}
                >
                  <p className="font-semibold">Notifications</p>
                  <p className={`mt-2 text-sm ${styles.sidebarMutedText}`}>
                    Your Biology assessment results are ready to review.
                  </p>
                </div>
              )}
            </div>

            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((open) => !open);
                  setNotificationsOpen(false);
                }}
                aria-label={`Profile menu for ${displayName}`}
                aria-expanded={profileMenuOpen}
                aria-controls="profile-menu"
                className={`flex min-h-9 items-center gap-2 cursor-pointer`}
              >
                <span className="relative block h-8 w-8 shrink-0">
                  {user?.profilePictureUrl ? (
                    <img
                      src={user.profilePictureUrl}
                      alt=""
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <span className={`flex h-full w-full items-center justify-center rounded-full text-[10px] font-semibold text-white ${styles.sidebarAccentBg}`}>
                      {(user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase()}
                      {(user?.lastName?.[0] || "").toUpperCase()}
                    </span>
                  )}
                  <span className={`absolute -bottom-0.5 -right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full border shadow-sm ${styles.border} ${styles.sidebarBg}`}>
                    <ChevronDown className={`h-2.5 w-2.5 transition-transform ${styles.sidebarMutedText} ${profileMenuOpen ? "rotate-180" : ""}`} />
                  </span>
                </span>
              </button>

              {profileMenuOpen && (
                <div
                  id="profile-menu"
                  className={`absolute right-0 top-full z-50 mt-2 max-h-[calc(100dvh-5rem)] w-64 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-xl border shadow-xl ${styles.border} ${styles.secondaryBg} ${styles.sidebarText} ${styles.themeTransition}`}
                >
                  <div className="flex min-w-0 items-center gap-3 px-4 pt-4">
                    
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{displayName}</span>
                      <span className={`block truncate text-xs ${styles.sidebarMutedText}`}>{user?.email}</span>
                    </span>
                  </div>

                  <div className={`mt-3 border-t ${styles.border}`} />
                 
                  <nav className="" aria-label="Profile navigation">
                    {navigation.map(({ label, to, icon: Icon }) => (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={() => setProfileMenuOpen(false)}
                        className={({ isActive }) =>
                          `${headerLinkClass({ isActive })} w-full`
                        }
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {label}
                      </NavLink>
                    ))}
                  </nav>

                  <div className={`flex min-h-11 items-center justify-between gap-3 border-t px-4 py-1.5 ${styles.border}`}>
                    <span className="text-xs font-medium">Appearance</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={darkMode}
                      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                      title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                      onClick={toggleDarkMode}
                      className={`group relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${styles.primaryBg} ${styles.border}`}
                    >
                      <span className="absolute inset-0 flex items-center justify-between px-1.5" aria-hidden="true">
                        <Sun
                          size={12}
                          className={`transition-opacity ${darkMode ? "opacity-50" : "opacity-0"}`}
                        />
                        <Moon
                          size={12}
                          className={`transition-opacity ${darkMode ? "opacity-0" : "opacity-50"}`}
                        />
                      </span>
                      <span
                        className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full border shadow-sm transition-transform duration-200 ${styles.secondaryBg} ${styles.border} ${darkMode ? "translate-x-[30px]" : "translate-x-0"}`}
                        aria-hidden="true"
                      >
                        {darkMode ? (
                          <Moon size={12} className="text-blue-500" />
                        ) : (
                          <Sun size={12} className="text-amber-500" />
                        )}
                      </span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      await signOut();
                      navigate("/", { replace: true });
                    }}
                    className={`mt-1 border-t ${styles.border} flex py-2.5 w-full items-center gap-2 rounded-b-lg 
                      px-4 text-xs font-semibold transition-colors ${styles.primaryText} 
                      ${styles.secondaryBgHover} cursor-pointer
                      `}
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      </header>

      {searchOpen && (
        <div
          className="modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSearchOpen(false);
              searchTriggerRef.current?.focus();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspace-search-title"
            className={`w-full max-w-xl overflow-hidden rounded-2xl border shadow-2xl ${styles.border} ${styles.secondaryBg}`}
          >
            <h2 id="workspace-search-title" className="sr-only">
              Search workspace
            </h2>
            <div
              className={`flex items-center gap-3 border-b px-4 ${styles.border}`}
            >
              <Search className={`h-5 w-5 shrink-0 ${styles.tertiaryText}`} />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search pages and study tools..."
                aria-label="Search pages and study tools"
                className={`min-w-0 flex-1 bg-transparent py-4 text-sm outline-none ${styles.primaryText}`}
              />
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  searchTriggerRef.current?.focus();
                }}
                aria-label="Close search"
                className={`rounded-md p-1.5 ${styles.secondaryBg} ${styles.secondaryBgHover}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {filteredSearchItems.length ? (
                filteredSearchItems.map(({ label, to, state, description }) => (
                  <Link
                    key={label}
                    to={to}
                    state={state}
                    onClick={() => setSearchOpen(false)}
                    className={`flex flex-col rounded-lg px-3 py-2.5 ${styles.secondaryBgHover}`}
                  >
                    <span
                      className={`text-sm font-medium ${styles.primaryText}`}
                    >
                      {label}
                    </span>
                    <span className={`mt-0.5 text-xs ${styles.tertiaryText}`}>
                      {description}
                    </span>
                  </Link>
                ))
              ) : (
                <p
                  className={`px-3 py-8 text-center text-sm ${styles.secondaryText}`}
                >
                  No pages or study tools found.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
      <main className={`mx-auto w-full min-w-0 max-w-7xl flex-1 p-4  ${styles.themeTransition}`}>        
        <BreadCrumbs />
        <Outlet />
      </main>
    </div>
  );
}
