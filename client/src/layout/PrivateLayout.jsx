import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Bell, ChevronDown, LogOut, Search, X } from "lucide-react";
import Logo from "../../../public/Finote.png";
import Styling from "../components/theme/Styling";
import DarkModeToggle from "../components/theme/DarkModeToggle";

const navigation = [
  { label: "Home", to: "/home" },
  { label: "My Schedule", to: "/schedule" },
  { label: "My Notes", to: "/notes" },
  { label: "Study Tools", to: "/study-tools" },
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
    to: "/study-tools?tab=flashcards",
    description: "Review with flashcards",
  },
  {
    label: "Mock Exams",
    to: "/study-tools?tab=mock-exams",
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
    description: "Manage your preferences",
  },
];

export default function PrivateLayout() {
  const styles = Styling();
  const location = useLocation();
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const accountRef = useRef(null);
  const notificationsRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchTriggerRef = useRef(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAccountOpen(false);
      setMobileOpen(false);
      setNotificationsOpen(false);
      setSearchOpen(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [location.pathname]);

  useEffect(() => {
    if (!searchOpen) return undefined;
    searchInputRef.current?.focus();
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        searchTriggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [searchOpen]);

  const linkClass = ({ isActive }) =>
    `border-b-2 px-1 py-5 text-sm font-medium transition ${
      isActive
        ? "border-[#1f2937] text-[#1f2937]"
        : "border-transparent text-[#77736d] hover:text-[#1f2937]"
    }`;
  const filteredSearchItems = searchItems.filter(({ label, description }) =>
    `${label} ${description}`
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase()),
  );

  return (
    <div className={`min-h-dvh ${styles.primaryBg} ${styles.primaryText}`}>
      <header className={`sticky top-0 z-50 w-full ${styles.headerBg}`}>
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center gap-2 px-4 sm:gap-8">
          <Link to="/home" className="flex items-center gap-2">
            <img src={Logo} alt="Finote" className="h-8 w-auto" />
            <span className="hidden sm:inline text-lg md:text-2xl font-sans font-medium text-blue-600 font-serif italic">
              Finote
            </span>
          </Link>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              ref={searchTriggerRef}
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSearchOpen(true);
              }}
              aria-label="Search workspace"
              className={`flex h-10 w-10 items-center justify-center rounded-full border sm:w-[250px] sm:justify-start sm:gap-2 sm:px-4 ${styles.border} ${styles.secondaryBg} ${styles.headerNavText} ${styles.secondaryBgHover}`}
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="hidden text-sm sm:inline">
                Search workspace...
              </span>
            </button>

            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((open) => !open)}
                className={`relative flex h-10 w-10 items-center justify-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 border cursor-pointer ${styles.border} ${styles.secondaryBg} ${styles.blueText} ${styles.secondaryBgHover}`}
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-1 top-1.5 h-2 w-2 rounded-full bg-red-500" />
              </button>
              {notificationsOpen && (
                <div
                  className={`absolute right-0 mt-2 w-72 rounded-lg border TRANSITION p-4 shadow-xl ${styles.border} ${styles.secondaryBg}`}
                >
                  <p className="font-semibold">Notifications</p>
                  <p className={`mt-2 text-sm ${styles.secondaryText}`}>
                    Your Biology assessment results are ready to review.
                  </p>
                </div>
              )}
            </div>

            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                aria-label={
                  accountOpen ? "Close account menu" : "Open account menu"
                }
                title="Account menu"
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold cursor-pointer"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-xs border ${styles.border} ${styles.secondaryBg} ${styles.blueText}`}
                >
                  AM
                </span>
                <span
                  className={`absolute -bottom-1 right-0 flex h-4 w-4 items-center justify-center rounded-full border ${styles.border} ${styles.secondaryBg}`}
                >
                  <ChevronDown
                    className={`h-3 w-3 ${styles.primaryText} transition-transform duration-200 ${accountOpen ? "rotate-180" : ""}`}
                  />
                </span>
              </button>
              {accountOpen && (
                <div
                  role="menu"
                  className={`absolute right-0 mt-2 w-60 overflow-hidden rounded-lg border shadow-xl ${styles.border} ${styles.secondaryBg}`}
                >
                  {navigation.map(({ label, to }, index) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={`block px-4 py-2 text-sm ${index === 0 ? "rounded-t-lg" : "rounded-none"} ${styles.headerNavText} ${styles.secondaryBgHover}`}
                      role="menuitem"
                    >
                      {label}
                    </NavLink>
                  ))}
                  <Link
                    to="/settings"
                    className={`block px-4 py-2 text-sm ${styles.headerNavText} ${styles.secondaryBgHover}`}
                    role="menuitem"
                  >
                    Settings
                  </Link>
                  <div
                    className={` flex items-center justify-between border-y px-4 py-2 ${styles.border}`}
                  >
                    <span className={`text-sm ${styles.primaryText}`}>
                      Dark mode
                    </span>
                    <DarkModeToggle />
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className={`block w-full text-left cursor-pointer px-4 py-2 text-sm rounded-b-lg ${styles.headerNavText} ${styles.secondaryBgHover}`}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {mobileOpen && (
          <nav
            className={`border-t px-4 py-3 md:hidden ${styles.border} ${styles.secondaryBg}`}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className={`text-sm font-semibold ${styles.secondaryText}`}>
                Alex Morgan
              </span>
              <DarkModeToggle />
            </div>
            <div className="space-y-1">
              {navigation.map(({ label, to }) => (
                <NavLink key={to} to={to} className={linkClass}>
                  {label}
                </NavLink>
              ))}
              <p
                className={`px-3 pt-2 text-xs font-bold uppercase ${styles.tertiaryText}`}
              >
                Study Tools
              </p>
              {["Flashcards", "Mock Exams"].map((item) => (
                <Link
                  key={item}
                  to={`/study-tools?tab=${encodeURIComponent(item.toLowerCase().replaceAll(" ", "-"))}`}
                  className={`block rounded-lg px-6 py-2 text-sm ${styles.headerNavText}`}
                >
                  {item}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => navigate("/")}
                className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          </nav>
        )}
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
                className={`rounded-md p-1.5 ${styles.headerNavText} ${styles.secondaryBgHover}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {filteredSearchItems.length ? (
                filteredSearchItems.map(({ label, to, description }) => (
                  <Link
                    key={label}
                    to={to}
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
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-6 md:px-5 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}
