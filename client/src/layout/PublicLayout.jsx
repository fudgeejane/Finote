import { Outlet, Link, useLocation } from "react-router-dom";
import { motion, useScroll, useSpring } from "motion/react";
import ScrollToHash from "../components/ui/ScrollToHash";
import Logo from "../../../public/Finote.png";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import Styling from "../components/theme/Styling";
import DarkModeToggle from "../components/theme/DarkModeToggle";
import { useSearchParams } from "react-router-dom";
import AuthModal from "../components/auth/AuthModal";

const navs = [
    { id: "home", label: "Home" },
    { id: "about", label: "About" },
    { id: "features", label: "Features" },
];

const helpItems = [
    { id: "contact", label: "Contact Us", to: "/contact" },
    { id: "termsOfServices", label: "Terms of Service", to: "/terms-of-services" },
    { id: "privacyPolicy", label: "Privacy Policy", to: "/privacy-policy" },
];

export default function PublicLayout() {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 25 });
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const [helpOpen, setHelpOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const helpRef = useRef(null);

    // Close the Help dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (helpRef.current && !helpRef.current.contains(e.target)) {
                setHelpOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Close the mobile menu if the screen grows to desktop size
    useEffect(() => {
        const onResize = () => {
            if (window.innerWidth >= 768) setMobileOpen(false);
        };
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const styles = Styling();

    const scrollToActiveSection = (event, sectionId) => {
        if (location.pathname !== "/" || location.hash !== `#${sectionId}`) return;

        event.preventDefault();
        document
            .getElementById(sectionId)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const [authMode, setAuthMode] = useState(null);

    useEffect(() => {
        const auth = searchParams.get("auth");
        if (auth === "signin" || auth === "signup") setAuthMode(auth);
    }, [searchParams]);

    return (
        <div className={`min-h-dvh flex flex-col ${styles.primaryBg}`}>
            <ScrollToHash />

            <header className={`sticky top-0 z-50 w-full ${styles.headerBg}`}>
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 py-2">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2">
                        <img src={Logo} alt="Finote" className="h-8 w-auto" />
                        <span className="hidden sm:inline text-lg md:text-2xl font-sans font-medium text-blue-600 font-serif italic">
                            Finote
                        </span>
                    </Link>

                    {/* Desktop nav */}
                    <nav className="hidden md:flex items-center gap-8">
                        {navs.map((s) => (
                            <Link
                                key={s.id}
                                to={`/#${s.id}`}
                                onClick={(event) => scrollToActiveSection(event, s.id)}
                                className={`${styles.headerNavText} font-semibold transition hover:cursor-pointer text-sm`}
                            >
                                {s.label}
                            </Link>
                        ))}

                        {/* Help Center dropdown */}
                        <div className="relative" ref={helpRef}>
                            <button
                                onClick={() => setHelpOpen((prev) => !prev)}
                                className={`flex items-center gap-1 ${styles.headerNavText} font-semibold transition hover:cursor-pointer text-sm`}
                            >
                                Help Center
                                <ChevronDown
                                    className={`h-4 w-4 transition-transform ${helpOpen ? "rotate-180" : ""}`}
                                />
                            </button>

                            {helpOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.15 }}
                                    className={`absolute left-0 top-full mt-2 w-44 rounded-md border py-1 shadow-lg ${styles.border} ${styles.secondaryBg}`}
                                >
                                    {helpItems.map((item) => (
                                        <Link
                                            key={item.id}
                                            to={item.to}
                                            onClick={() => setHelpOpen(false)}
                                            className={`block px-4 py-2 text-sm transition ${styles.headerNavText}`}
                                        >
                                            {item.label}
                                        </Link>
                                    ))}
                                </motion.div>
                            )}
                        </div>
                    </nav>

                    {/* Right side: toggle, buttons, hamburger */}
                    <div className="flex items-center gap-2">
                        <DarkModeToggle />

                        <button
                            onClick={() => setAuthMode("signin")}
                            className={`hidden md:block text-sm rounded-full px-4 py-2 ${styles.buttonFrost} hover:cursor-pointer`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => setAuthMode("signup")}
                            className={`hidden md:block text-sm rounded-full px-4 py-2 ${styles.buttonBlue} hover:cursor-pointer`}
                        >
                            Get Started
                        </button>

                        {/* Hamburger (mobile only) */}
                        <button
                            className="md:hidden p-2 rounded-md"
                            onClick={() => setMobileOpen((prev) => !prev)}
                            aria-label="Toggle menu"
                            aria-expanded={mobileOpen}
                        >
                            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu panel */}
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                        className={`md:hidden border-t ${styles.border} ${styles.headerBg} px-4 pb-4`}
                    >
                        <nav className="flex flex-col gap-1 pt-3">
                            {navs.map((s) => (
                                <Link
                                    key={s.id}
                                    to={`/#${s.id}`}
                                    onClick={(event) => {
                                        scrollToActiveSection(event, s.id);
                                        setMobileOpen(false);
                                    }}
                                    className={`${styles.headerNavText} py-2 text-sm font-semibold`}
                                >
                                    {s.label}
                                </Link>
                            ))}

                            <p className={`mt-3 text-xs font-semibold uppercase ${styles.secondaryText}`}>
                                Help Center
                            </p>
                            {helpItems.map((item) => (
                                <Link
                                    key={item.id}
                                    to={item.to}
                                    onClick={() => setMobileOpen(false)}
                                    className={`${styles.headerNavText} py-2 pl-3 text-sm`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </nav>

                        <div className="mt-4 flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    setMobileOpen(false);
                                    setAuthMode("signin");
                                }}
                                className={`text-sm rounded-full px-4 py-2 ${styles.buttonFrost}`}
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => {
                                    setMobileOpen(false);
                                    setAuthMode("signup");
                                }}
                                className={`text-sm rounded-md px-4 py-2 ${styles.buttonBlue}`}
                            >
                                Get Started
                            </button>
                        </div>
                    </motion.div>
                )}
            </header>

            <main className="flex-1">
                <Outlet context={{ openAuth: setAuthMode }} />
            </main>

            <footer className={`border-t ${styles.headerBg} ${styles.primaryText}`}>
                <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <Link to="/" className="flex items-center gap-2">
                            <img src={Logo} alt="Finote" className="h-8 w-auto" />
                            <span className="font-sans text-lg font-medium text-blue-600 font-serif italic">Finote</span>
                        </Link>
                        <p className="mt-3 max-w-xs text-sm leading-6">
                            A simple place to capture, organize, and manage your notes.
                        </p>
                    </div>

                    <div>
                        <h3 className={`mb-3 text-sm font-semibold ${styles.secondaryText}`}>Pages</h3>
                        <nav className="flex flex-col gap-2 text-sm">
                            {navs.map((s) => (
                                <Link
                                    key={s.id}
                                    to={`/#${s.id}`}
                                    onClick={(event) => scrollToActiveSection(event, s.id)}
                                    className={`transition ${styles.headerNavText}`}
                                >
                                    {s.label}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    <div>
                        <h3 className={`mb-3 text-sm font-semibold ${styles.secondaryText}`}>Help</h3>
                        <nav className="flex flex-col gap-2 text-sm">
                            {helpItems.map((item) => (
                                <Link
                                    key={item.id}
                                    to={item.to}
                                    className={`transition ${styles.headerNavText}`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>

                <div className={`border-t ${styles.border}`}>
                    <p className="mx-auto max-w-7xl px-4 py-5 text-sm text-center">
                        &copy; {new Date().getFullYear()} Finote. All rights reserved.
                    </p>
                </div>
            </footer>

            {authMode && (
                <AuthModal
                    key={authMode}
                    mode={authMode}
                    onClose={() => setAuthMode(null)}
                    onSwitch={() =>
                        setAuthMode((current) =>
                            current === "signin" ? "signup" : "signin"
                        )
                    }
                />
            )}
        </div>
    );
}
