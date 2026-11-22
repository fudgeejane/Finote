import { useMemo, useState } from "react";
import { ChevronRight, FileText, KeyRound, Search, Settings2, ShieldCheck, Trash2, User } from "lucide-react";
import Styling from "../../components/theme/Styling";
import DarkModeToggle from "../../components/theme/DarkModeToggle";
import { privacySections, terms } from "../../data/legalContent";

const settingsSections = [
    {
        title: "Your account",
        items: [
            { id: "profile", label: "Personal details", description: "Manage your profile information", icon: User },
            { id: "account-settings", label: "Account settings", description: "Password and account actions", icon: KeyRound },
        ],
    },
    {
        title: "Preferences",
        items: [
            { id: "preferences", label: "Preferences", description: "Appearance and study notifications", icon: Settings2 },
        ],
    },
    {
        title: "Support",
        items: [
            { id: "terms-of-service", label: "Terms of Service", description: "Review the terms for using Finote", icon: FileText },
            { id: "privacy-policy", label: "Privacy Policy", description: "Review how privacy is handled", icon: ShieldCheck },
        ],
    },
];

export default function SettingsPage() {
    const styles = Styling();
    const [saved, setSaved] = useState(false);
    const [activeSection, setActiveSection] = useState("profile");
    const [search, setSearch] = useState("");
    const [profile, setProfile] = useState({ name: "Alex Morgan", email: "alex.morgan@example.com", institution: "Northview High School" });
    const [preferences, setPreferences] = useState({ reminders: true, weekly: true, sound: false });
    const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
    const [accountMessage, setAccountMessage] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const filteredSections = useMemo(() => settingsSections
        .map((section) => ({
            ...section,
            items: section.items.filter((item) =>
                `${section.title} ${item.label} ${item.description}`.toLowerCase().includes(search.trim().toLowerCase())
            ),
        }))
        .filter((section) => section.items.length > 0), [search]);
    const selectedItem = settingsSections.flatMap((section) => section.items).find((item) => item.id === activeSection);
    const selectedPolicy = activeSection === "terms-of-service"
        ? {
            title: "Terms of Service",
            description: "Guidelines for using Finote responsibly, protecting your account, and understanding service availability.",
            entries: terms,
        }
        : activeSection === "privacy-policy"
            ? {
                title: "Privacy Policy",
                description: "Information about Finote's data practices, including collection, use, storage, sharing, and user choices.",
                entries: privacySections,
            }
            : null;

    const save = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
    };

    const previewPasswordChange = (event) => {
        event.preventDefault();
        if (passwords.next !== passwords.confirm) {
            setAccountMessage("The new password and confirmation do not match.");
            return;
        }
        setAccountMessage("UI preview only: your password was not changed.");
        setPasswords({ current: "", next: "", confirm: "" });
    };

    return (
        <div className={`mx-auto max-w-7xl space-y-6 ${styles.primaryText}`}>
            <header>
                <p className={`text-xs font-medium uppercase tracking-[0.12em] ${styles.tertiaryText}`}>Account</p>
                <h1 className="mt-2 text-3xl font-semibold">Settings &amp; privacy</h1>
                <p className={`mt-2 text-sm ${styles.secondaryText}`}>Manage your account, preferences, and support information.</p>
            </header>

            {saved && (
                <div role="status" className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600">
                    Your settings have been saved.
                </div>
            )}

            <div className="grid items-start gap-2.5 lg:grid-cols-[300px_minmax(0,1fr)]">
                <aside className={`rounded-lg border p-3 sm:p-4 ${styles.border} ${styles.secondaryBg}`}>
                    <label className="relative block">
                        <Search className={`absolute left-3 top-2.5 h-4 w-4 ${styles.tertiaryText}`} aria-hidden="true" />
                        <span className="sr-only">Search settings</span>
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search settings"
                            className={`w-full rounded-full border py-2 pl-9 pr-3 text-sm ${styles.input} ${styles.border}`}
                        />
                    </label>

                    <nav aria-label="Settings" className="mt-4 space-y-5">
                        {filteredSections.map((section) => (
                            <section key={section.title}>
                                <h2 className={`px-2 pb-1 text-xs font-semibold uppercase tracking-wide ${styles.tertiaryText}`}>
                                    {section.title}
                                </h2>
                                <div className="space-y-1">
                                    {section.items.map(({ id, label, description, icon: Icon }) => (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => setActiveSection(id)}
                                            aria-current={activeSection === id ? "page" : undefined}
                                            className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-3 text-left transition ${
                                                activeSection === id ? "bg-blue-600/10" : styles.secondaryBgHover
                                            }`}
                                        >
                                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                                activeSection === id ? "bg-blue-600 text-white" : `${styles.grayBg} ${styles.secondaryText}`
                                            }`}>
                                                <Icon className="h-4 w-4" aria-hidden="true" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className={`block text-sm font-semibold ${activeSection === id ? styles.blueText : styles.primaryText}`}>
                                                    {label}
                                                </span>
                                                <span className={`mt-0.5 block text-xs ${styles.secondaryText}`}>{description}</span>
                                            </span>
                                            <ChevronRight className={`h-4 w-4 shrink-0 ${styles.tertiaryText}`} aria-hidden="true" />
                                        </button>
                                    ))}
                                </div>
                            </section>
                        ))}
                        {filteredSections.length === 0 && (
                            <p className={`px-2 py-5 text-center text-sm ${styles.secondaryText}`}>No settings match your search.</p>
                        )}
                    </nav>
                </aside>

                <section aria-label={selectedPolicy?.title || "Settings panel"} className={`min-w-0 rounded-lg border p-5 sm:p-7 ${styles.border} ${styles.secondaryBg}`}>
                    <header className={`mb-6 border-b pb-5 ${styles.border}`}>
                        <h2 id="settings-panel-title" className="text-lg sm:text-xl md:text-2xl font-semibold">{selectedPolicy?.title || selectedItem?.label}</h2>
                        <p className={`mt-1 text-sm ${styles.secondaryText}`}>{selectedPolicy?.description || selectedItem?.description}</p>
                    </header>

                    {selectedPolicy ? (
                        <ol className="list-decimal space-y-5 pl-5">
                            {selectedPolicy.entries.map(({ title, paragraphs }) => (
                                <li key={title} className="pl-1">
                                    <h3 className="font-semibold">{title}</h3>
                                    {paragraphs.map((paragraph, index) => (
                                        <p key={index} className={`mt-2 text-sm leading-7 ${styles.secondaryText}`}>
                                            {paragraph}
                                        </p>
                                    ))}
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <>
                            {activeSection === "profile" && (
                                <>
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white">
                                            <User className="h-6 w-6" aria-hidden="true" />
                                        </span>
                                        <div>
                                            <h3 className="font-semibold">Account information</h3>
                                            <p className={`text-xs ${styles.secondaryText}`}>Personal profile details</p>
                                        </div>
                                    </div>
                                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                        {[
                                            { key: "name", label: "Full name" },
                                            { key: "email", label: "Email address", type: "email" },
                                            { key: "institution", label: "School or institution" },
                                        ].map((field) => (
                                            <label key={field.key} className={`text-sm font-medium ${styles.primaryText}`}>
                                                {field.label}
                                                <input
                                                    type={field.type || "text"}
                                                    value={profile[field.key]}
                                                    onChange={(event) => setProfile({ ...profile, [field.key]: event.target.value })}
                                                    className={`mt-2 w-full rounded-lg border px-3 py-2.5 text-sm ${styles.input} ${styles.border}`}
                                                />
                                            </label>
                                        ))}
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <button type="button" onClick={save} className={`rounded-lg px-5 py-2.5 text-sm font-semibold ${styles.buttonBlue}`}>
                                            Save Changes
                                        </button>
                                    </div>
                                </>
                            )}

                            {activeSection === "account-settings" && (
                                <div className="space-y-6">
                                    <div className={`rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3 text-sm ${styles.secondaryText}`}>
                                        This is a UI preview. Password reset and account deletion are not connected to an account service.
                                    </div>

                                    <section aria-labelledby="change-password-heading">
                                        <h3 id="change-password-heading" className="font-semibold">Change password</h3>
                                        <p className={`mt-1 text-sm ${styles.secondaryText}`}>Enter your current password and choose a new one.</p>
                                        <form onSubmit={previewPasswordChange} className="mt-4 grid max-w-xl gap-4">
                                            {[
                                                { key: "current", label: "Current password", autocomplete: "current-password" },
                                                { key: "next", label: "New password", autocomplete: "new-password" },
                                                { key: "confirm", label: "Confirm new password", autocomplete: "new-password" },
                                            ].map(({ key, label, autocomplete }) => (
                                                <label key={key} className={`text-sm font-medium ${styles.primaryText}`}>
                                                    {label}
                                                    <input
                                                        type="password"
                                                        autoComplete={autocomplete}
                                                        value={passwords[key]}
                                                        onChange={(event) => setPasswords({ ...passwords, [key]: event.target.value })}
                                                        required
                                                        minLength={key === "current" ? undefined : 8}
                                                        className={`mt-2 w-full rounded-lg border px-3 py-2.5 text-sm ${styles.input} ${styles.border}`}
                                                    />
                                                </label>
                                            ))}
                                            <div>
                                                <button type="submit" className={`rounded-lg px-4 py-2.5 text-sm font-semibold ${styles.buttonBlue}`}>
                                                    Change Password
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAccountMessage("UI preview only: no password reset email was sent.")}
                                                    className={`ml-3 text-sm font-medium underline underline-offset-4 ${styles.blueText}`}
                                                >
                                                    Forgot password?
                                                </button>
                                            </div>
                                        </form>
                                    </section>

                                    <section className={`border-t pt-5 ${styles.border}`} aria-labelledby="delete-account-heading">
                                        <h3 id="delete-account-heading" className="font-semibold">Delete account</h3>
                                        <p className={`mt-1 max-w-xl text-sm leading-6 ${styles.secondaryText}`}>
                                            Account deletion is permanent. This preview will not delete your account or data.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setDeleteDialogOpen(true)}
                                            className={`mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ${styles.buttonRed}`}
                                        >
                                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                                            Delete Account
                                        </button>
                                    </section>

                                    {accountMessage && (
                                        <p role="status" className={`rounded-lg border px-4 py-3 text-sm ${styles.border} ${styles.secondaryText}`}>
                                            {accountMessage}
                                        </p>
                                    )}
                                </div>
                            )}

                            {activeSection === "preferences" && (
                                <>
                                    <h3 className="font-semibold">Application preferences</h3>
                                    <div className={`mt-3 divide-y ${styles.divide}`}>
                                        <div className="flex items-center justify-between gap-4 py-4">
                                            <div>
                                                <p className="text-sm font-medium">Appearance</p>
                                                <p className={`text-xs ${styles.secondaryText}`}>Switch between light and dark themes</p>
                                            </div>
                                            <DarkModeToggle />
                                        </div>
                                        {[
                                            ["reminders", "Study reminders", "Receive reminders for scheduled study sessions"],
                                            ["weekly", "Weekly progress report", "Get a summary of your learning each week"],
                                            ["sound", "Study timer sounds", "Play a sound when a timer finishes"],
                                        ].map(([key, label, description]) => (
                                            <label key={key} className="flex cursor-pointer items-center justify-between gap-4 py-4">
                                                <span>
                                                    <span className="block text-sm font-medium">{label}</span>
                                                    <span className={`block text-xs ${styles.secondaryText}`}>{description}</span>
                                                </span>
                                                <input
                                                    type="checkbox"
                                                    checked={preferences[key]}
                                                    onChange={(event) => setPreferences({ ...preferences, [key]: event.target.checked })}
                                                    className="h-4 w-4 accent-blue-600"
                                                />
                                            </label>
                                        ))}
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <button type="button" onClick={save} className={`rounded-lg px-5 py-2.5 text-sm font-semibold ${styles.buttonBlue}`}>
                                            Save Changes
                                        </button>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </section>
            </div>

            {deleteDialogOpen && (
                <div
                    className="modal-overlay"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) setDeleteDialogOpen(false);
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-account-dialog-title"
                        className={`w-full max-w-md rounded-lg border p-6 ${styles.border} ${styles.secondaryBg} ${styles.shadow}`}
                    >
                        <h2 id="delete-account-dialog-title" className="text-lg font-semibold">Delete account?</h2>
                        <p className={`mt-2 text-sm leading-6 ${styles.secondaryText}`}>
                            This is a UI-only preview. No account or data will be deleted.
                        </p>
                        <div className="mt-6 flex justify-end gap-2">
                            <button type="button" onClick={() => setDeleteDialogOpen(false)} className={`rounded-lg px-4 py-2 text-sm ${styles.buttonFrost}`}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setDeleteDialogOpen(false);
                                    setAccountMessage("UI preview only: no account or data was deleted.");
                                }}
                                className={`rounded-lg px-4 py-2 text-sm font-medium ${styles.buttonRed}`}
                            >
                                Confirm
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
