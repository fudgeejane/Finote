import { useMemo, useRef, useState } from "react";
import {
    AsYouType,
    getCountries,
    getCountryCallingCode,
    parsePhoneNumberFromString,
} from "libphonenumber-js";
import { ChevronRight, FileText, KeyRound, Search, ShieldCheck, Trash2, Upload, User } from "lucide-react";
import Styling from "../../components/theme/Styling";
import { privacySections, terms } from "../../data/legalContent";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const countries = getCountries()
    .map((code) => ({ code, name: countryNames.of(code) || code }))
    .sort((left, right) => left.name.localeCompare(right.name));
const countryCodesByName = new Map(
    countries.flatMap(({ code, name }) => [
        [name.toLocaleLowerCase("en"), code],
        [code.toLocaleLowerCase("en"), code],
    ]),
);
const namePattern = /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u;
const acceptedPictureTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const addressFields = [
    ["houseBuildingNumber", "House/building number"],
    ["street", "Street"],
    ["barangay", "Barangay"],
    ["cityMunicipality", "City / municipality"],
    ["province", "Province"],
    ["postalCode", "Postal code"],
];

function getCountryCode(country) {
    return countryCodesByName.get(String(country || "").trim().toLocaleLowerCase("en"));
}

function getInitialProfile(user) {
    const phone = user?.contactNumber || "";
    const parsedPhone = parsePhoneNumberFromString(phone, "PH");
    const country = parsedPhone?.country || getCountryCode(user?.address?.country) || "PH";
    return {
        firstName: user?.firstName || "",
        middleName: user?.middleName || "",
        lastName: user?.lastName || "",
        dateOfBirth: user?.dateOfBirth || "",
        gender: user?.gender || "",
        phoneCountry: country,
        phoneInput: parsedPhone?.formatNational() || phone,
        address: {
            houseBuildingNumber: user?.address?.houseBuildingNumber || "",
            street: user?.address?.street || "",
            barangay: user?.address?.barangay || "",
            cityMunicipality: user?.address?.cityMunicipality || "",
            province: user?.address?.province || "",
            postalCode: user?.address?.postalCode || "",
            country: user?.address?.country || "Philippines",
        },
    };
}

const settingsSections = [
    {
        title: "Your account",
        items: [
            { id: "profile", label: "Personal details", description: "Manage your profile information", icon: User },
            { id: "account-settings", label: "Account settings", description: "Password and account actions", icon: KeyRound },
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
    const { user, apiRequest, setUser } = useAuth();
    const [activeSection, setActiveSection] = useState("profile");
    const [search, setSearch] = useState("");
    const [profile, setProfile] = useState(() => getInitialProfile(user));
    const [savingProfile, setSavingProfile] = useState(false);
    const [pictureBusy, setPictureBusy] = useState(false);
    const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
    const [accountMessage, setAccountMessage] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const pictureInputRef = useRef(null);

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

    const updateAddress = (key, value) => {
        setProfile((current) => ({
            ...current,
            address: { ...current.address, [key]: value },
        }));
    };

    const updateAddressCountry = (country) => {
        const phoneCountry = getCountryCode(country) || "PH";
        setProfile((current) => ({
            ...current,
            phoneCountry,
            phoneInput: new AsYouType(phoneCountry).input(current.phoneInput),
            address: {
                houseBuildingNumber: "",
                street: "",
                barangay: "",
                cityMunicipality: "",
                province: "",
                postalCode: "",
                country,
            },
        }));
    };

    const saveProfile = async (event) => {
        event.preventDefault();
        const errors = [];
        if (!profile.firstName.trim() || !namePattern.test(profile.firstName.trim())) {
            errors.push("Enter a valid first name.");
        }
        if (!profile.lastName.trim() || !namePattern.test(profile.lastName.trim())) {
            errors.push("Enter a valid last name.");
        }
        if (profile.middleName.trim() && !namePattern.test(profile.middleName.trim())) {
            errors.push("Enter a valid middle name.");
        }
        const parsedPhone = parsePhoneNumberFromString(profile.phoneInput, profile.phoneCountry);
        if (!profile.phoneInput.trim() || !parsedPhone?.isValid()) {
            errors.push("Enter a valid mobile number for the selected country.");
        }
        const hasAddressDetails = Object.entries(profile.address).some(
            ([field, value]) => field !== "country" && value.trim(),
        );
        if (
            hasAddressDetails &&
            ["street", "cityMunicipality", "province", "country"].some(
                (field) => !profile.address[field].trim(),
            )
        ) {
            errors.push("Complete the street, city, province, and country for your address.");
        }
        if (errors.length) {
            toast.error(errors[0]);
            return;
        }

        setSavingProfile(true);
        try {
            const response = await apiRequest("/users/complete-profile", {
                method: "PUT",
                body: JSON.stringify({
                    profileType: user?.profileType || "student",
                    firstName: profile.firstName,
                    middleName: profile.middleName,
                    lastName: profile.lastName,
                    dateOfBirth: profile.dateOfBirth,
                    gender: profile.gender,
                    contactNumber: parsedPhone.number,
                    address: profile.address,
                }),
            });
            setUser((current) => ({ ...current, ...response.user }));
            toast.success(response.message || "Personal details saved.");
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSavingProfile(false);
        }
    };

    const uploadProfilePicture = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        if (!acceptedPictureTypes.has(file.type) || file.size > 5 * 1024 * 1024) {
            toast.error("Choose a JPEG, PNG, or WebP image up to 5 MB.");
            return;
        }

        setPictureBusy(true);
        try {
            const body = new FormData();
            body.append("profilePicture", file);
            const response = await apiRequest("/users/profile-picture", {
                method: "POST",
                body,
            });
            setUser((current) => ({ ...current, ...response.user }));
            toast.success(response.message || "Profile picture updated.");
            if (response.warning) toast.error(response.warning);
        } catch (error) {
            toast.error(error.message || "Could not update your profile picture.");
        } finally {
            setPictureBusy(false);
        }
    };

    const removeProfilePicture = async () => {
        if (!user?.profilePictureUrl || pictureBusy) return;
        if (!window.confirm("Remove your profile picture?")) return;

        setPictureBusy(true);
        try {
            const response = await apiRequest("/users/profile-picture", {
                method: "DELETE",
            });
            setUser((current) => ({ ...current, ...response.user }));
            toast.success(response.message || "Profile picture removed.");
        } catch (error) {
            toast.error(error.message || "Could not remove your profile picture.");
        } finally {
            setPictureBusy(false);
        }
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
                <p className={`mt-2 text-sm ${styles.secondaryText}`}>Manage your personal information, account access, and support information.</p>
            </header>

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
                                <form onSubmit={saveProfile} className="space-y-7">
                                    <section aria-labelledby="personal-details-heading">
                                        <div className="flex items-center gap-3">
                                            {user?.profilePictureUrl ? (
                                                <img src={user.profilePictureUrl} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
                                            ) : (
                                                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${styles.blueBg2} ${styles.blueText}`}>
                                                    {(user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase()}
                                                    {(user?.lastName?.[0] || "").toUpperCase()}
                                                </span>
                                            )}
                                            <div className="min-w-0">
                                                <h3 id="personal-details-heading" className="truncate font-semibold">
                                                    {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Personal information"}
                                                </h3>
                                                <p className={`truncate text-xs ${styles.secondaryText}`}>{user?.email}</p>
                                                <input
                                                    ref={pictureInputRef}
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp"
                                                    onChange={uploadProfilePicture}
                                                    disabled={pictureBusy}
                                                    className="sr-only"
                                                />
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => pictureInputRef.current?.click()}
                                                        disabled={pictureBusy}
                                                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${styles.buttonFrost}`}
                                                    >
                                                        <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                                                        {pictureBusy ? "Updating photo…" : user?.profilePictureUrl ? "Change photo" : "Upload photo"}
                                                    </button>
                                                    {user?.profilePictureUrl && (
                                                        <button
                                                            type="button"
                                                            onClick={removeProfilePicture}
                                                            disabled={pictureBusy}
                                                            className={`rounded-full px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60 ${styles.redText} hover:bg-red-500/10`}
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <p className={`ml-[4.25rem] mt-1 text-[11px] ${styles.secondaryText}`}>
                                            JPEG, PNG, or WebP; up to 5 MB.
                                        </p>
                                        <p className={`mt-4 text-sm ${styles.secondaryText}`}>Update your personal information, contact details, and address.</p>
                                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                            {[
                                                { key: "firstName", label: "First name", required: true },
                                                { key: "middleName", label: "Middle name" },
                                                { key: "lastName", label: "Last name", required: true },
                                            ].map(({ key, label, required }) => (
                                                <label key={key} className={`text-sm font-medium ${styles.primaryText}`}>
                                                    {label}{required && " *"}
                                                    <input
                                                        value={profile[key]}
                                                        onChange={(event) => setProfile((current) => ({ ...current, [key]: event.target.value }))}
                                                        required={required}
                                                        maxLength={80}
                                                        className={`mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm ${styles.input} ${styles.border}`}
                                                    />
                                                </label>
                                            ))}
                                            <label className={`text-sm font-medium ${styles.primaryText}`}>
                                                Date of birth
                                                <input
                                                    type="date"
                                                    value={profile.dateOfBirth}
                                                    max={new Date().toISOString().slice(0, 10)}
                                                    onChange={(event) => setProfile((current) => ({ ...current, dateOfBirth: event.target.value }))}
                                                    className={`mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm ${styles.input} ${styles.border}`}
                                                />
                                            </label>
                                            <label className={`text-sm font-medium ${styles.primaryText}`}>
                                                Gender
                                                <select
                                                    value={profile.gender}
                                                    onChange={(event) => setProfile((current) => ({ ...current, gender: event.target.value }))}
                                                    className={`mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm ${styles.input} ${styles.border}`}
                                                >
                                                    <option value="">Select an option</option>
                                                    <option value="male">Male</option>
                                                    <option value="female">Female</option>
                                                    <option value="prefer_not_to_say">Prefer not to say</option>
                                                </select>
                                            </label>
                                        </div>
                                    </section>

                                    <section aria-labelledby="contact-details-heading" className={`border-t pt-6 ${styles.border}`}>
                                        <h3 id="contact-details-heading" className="font-semibold">Contact information</h3>
                                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                            <label className={`text-sm font-medium ${styles.primaryText}`}>
                                                Email address
                                                <input
                                                    type="email"
                                                    value={user?.email || ""}
                                                    disabled
                                                    className={`mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm opacity-70 ${styles.input} ${styles.border}`}
                                                />
                                                <span className={`mt-1 block text-xs ${styles.secondaryText}`}>Email cannot be changed here.</span>
                                            </label>
                                            <div>
                                                <label className={`text-sm font-medium ${styles.primaryText}`} htmlFor="settings-mobile-number">
                                                    Mobile number *
                                                </label>
                                                <div className="mt-1.5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_1.3fr]">
                                                    <select
                                                        value={profile.phoneCountry}
                                                        aria-label="Phone country code"
                                                        onChange={(event) => {
                                                            const phoneCountry = event.target.value;
                                                            setProfile((current) => ({
                                                                ...current,
                                                                phoneCountry,
                                                                phoneInput: new AsYouType(phoneCountry).input(current.phoneInput),
                                                            }));
                                                        }}
                                                        className={`w-full rounded-lg border px-3 py-2.5 text-sm ${styles.input} ${styles.border}`}
                                                    >
                                                        {countries.map(({ code, name }) => (
                                                            <option key={code} value={code}>
                                                                {name} (+{getCountryCallingCode(code)})
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        id="settings-mobile-number"
                                                        type="tel"
                                                        inputMode="tel"
                                                        value={profile.phoneInput}
                                                        onChange={(event) => setProfile((current) => ({
                                                            ...current,
                                                            phoneInput: new AsYouType(current.phoneCountry).input(event.target.value),
                                                        }))}
                                                        required
                                                        className={`w-full rounded-lg border px-3 py-2.5 text-sm ${styles.input} ${styles.border}`}
                                                    />
                                                </div>
                                                <span className={`mt-1 block text-xs ${styles.secondaryText}`}>Number formatting follows the selected country.</span>
                                            </div>
                                        </div>
                                    </section>

                                    <section aria-labelledby="address-details-heading" className={`border-t pt-6 ${styles.border}`}>
                                        <h3 id="address-details-heading" className="font-semibold">Address</h3>
                                        <p className={`mt-1 text-xs ${styles.secondaryText}`}>Optional. If you add an address, complete the street, city, province, and country.</p>
                                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                            <label className={`text-sm font-medium sm:col-span-2 ${styles.primaryText}`}>
                                                Country
                                                <select
                                                    value={profile.address.country}
                                                    onChange={(event) => updateAddressCountry(event.target.value)}
                                                    className={`mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm ${styles.input} ${styles.border}`}
                                                >
                                                    <option value="">Select a country</option>
                                                    {countries.map(({ code, name }) => (
                                                        <option key={code} value={name}>{name}</option>
                                                    ))}
                                                </select>
                                            </label>
                                            {addressFields.map(([key, label]) => (
                                                <label key={key} className={`text-sm font-medium ${styles.primaryText}`}>
                                                    {label}
                                                    <input
                                                        value={profile.address[key]}
                                                        maxLength={key === "postalCode" ? 20 : 120}
                                                        onChange={(event) => updateAddress(key, event.target.value)}
                                                        className={`mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm ${styles.input} ${styles.border}`}
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                    </section>

                                    <div className="flex justify-end border-t pt-5">
                                        <button
                                            type="submit"
                                            disabled={savingProfile}
                                            className={`rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-60 ${styles.buttonBlue}`}
                                        >
                                            {savingProfile ? "Saving…" : "Save Changes"}
                                        </button>
                                    </div>
                                </form>
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
