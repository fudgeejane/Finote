import { useEffect, useRef, useState } from "react";
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from "libphonenumber-js";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../auth/AuthContext";
import Styling from "../../components/theme/Styling";
import { Upload, SquareArrowUpRightExit } from "lucide-react";

const namePattern = /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u;
const acceptedPictureTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const countryNames = new Intl.DisplayNames(["en"], { type: "region" });
const countries = getCountries()
  .map((code) => ({
    code,
    name: countryNames.of(code) || code,
  }))
  .sort((left, right) => left.name.localeCompare(right.name));
const countryCodesByName = new Map(
  countries.flatMap(({ code, name }) => [
    [name.toLocaleLowerCase("en"), code],
    [code.toLocaleLowerCase("en"), code],
  ])
);

const addressFields = [
  ["houseBuildingNumber", "House/building number"],
  ["street", "Street"],
  ["barangay", "Barangay"],
  ["cityMunicipality", "City/municipality"],
  ["province", "Province"],
  ["postalCode", "Postal code"],
];

function isValidName(value) {
  const name = value.trim();
  return name.length > 0 && name.length <= 80 && namePattern.test(name);
}

function isValidDateOfBirth(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value <= new Date().toISOString().slice(0, 10)
  );
}

function getCountryCode(country) {
  return countryCodesByName.get(
    String(country || "")
      .trim()
      .toLocaleLowerCase("en")
  );
}

function getInitialPhone(user) {
  const existingNumber = user?.contactNumber || "";
  const parsedNumber = parsePhoneNumberFromString(existingNumber, "PH");
  const country =
    parsedNumber?.country || getCountryCode(user?.address?.country) || "PH";
  return {
    country,
    input:
      parsedNumber?.country === country
        ? parsedNumber.formatNational()
        : parsedNumber?.formatInternational() || existingNumber,
  };
}

function getInitialForm(user) {
  return {
    firstName: user?.firstName || "",
    middleName: user?.middleName || "",
    lastName: user?.lastName || "",
    dateOfBirth: user?.dateOfBirth || "",
    gender: user?.gender || "",
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

export default function CompleteProfilePage() {
  const { user, apiRequest, setUser } = useAuth();
  const styles = Styling();
  const navigate = useNavigate();
  const picturePreviewRef = useRef("");
  const initialPhone = getInitialPhone(user);
  const [form, setForm] = useState(() => getInitialForm(user));
  const [phoneCountry, setPhoneCountry] = useState(initialPhone.country);
  const [phoneInput, setPhoneInput] = useState(initialPhone.input);
  const [validationErrors, setValidationErrors] = useState({});
  const [pictureFile, setPictureFile] = useState(null);
  const [picturePreview, setPicturePreview] = useState(
    user?.profilePictureUrl || ""
  );
  const [pictureRemoved, setPictureRemoved] = useState(false);
  const [pictureFailed, setPictureFailed] = useState(false);
  const [pictureError, setPictureError] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [addressMessage, setAddressMessage] = useState("");
  const [addressSearchBusy, setAddressSearchBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setValidationErrors((current) => ({ ...current, [key]: "" }));
  };
  const updateAddress = (key, value) => {
    setForm((current) => ({
      ...current,
      address: { ...current.address, [key]: value },
    }));
    setValidationErrors((current) => ({ ...current, address: "" }));
  };
  const syncPhoneCountry = (countryName) => {
    const countryCode = getCountryCode(countryName) || "PH";
    setPhoneCountry(countryCode);
    setPhoneInput((current) => new AsYouType(countryCode).input(current));
    setValidationErrors((current) => ({ ...current, contactNumber: "" }));
  };

  const handlePictureChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!acceptedPictureTypes.has(file.type) || file.size > 5 * 1024 * 1024) {
      setPictureError("Choose a JPEG, PNG, or WebP image up to 5 MB.");
      return;
    }
    setPictureError("");

    if (picturePreviewRef.current) {
      URL.revokeObjectURL(picturePreviewRef.current);
    }
    const previewUrl = URL.createObjectURL(file);
    picturePreviewRef.current = previewUrl;
    setPicturePreview(previewUrl);
    setPictureFailed(false);
    setPictureFile(file);
    setPictureRemoved(false);
  };

  const handlePictureRemove = () => {
    if (pictureFile) {
      if (window.confirm("Discard the selected profile picture?")) {
        if (picturePreviewRef.current) {
          URL.revokeObjectURL(picturePreviewRef.current);
          picturePreviewRef.current = "";
        }
        setPictureFile(null);
        setPicturePreview(user?.profilePictureUrl || "");
        setPictureFailed(false);
      }
      return;
    }

    if (
      user?.profilePictureUrl &&
      window.confirm("Delete your current profile picture?")
    ) {
      setPictureRemoved(true);
      setPictureFailed(false);
    }
  };

  const cancelChanges = () => {
    const savedPhone = getInitialPhone(user);
    if (picturePreviewRef.current) {
      URL.revokeObjectURL(picturePreviewRef.current);
      picturePreviewRef.current = "";
    }
    setForm(getInitialForm(user));
    setPhoneCountry(savedPhone.country);
    setPhoneInput(savedPhone.input);
    setPictureFile(null);
    setPicturePreview(user?.profilePictureUrl || "");
    setPictureRemoved(false);
    setPictureFailed(false);
    setAddressQuery("");
    setAddressSuggestions([]);
    setAddressMessage("");
    setValidationErrors({});
  };

  const validateForm = () => {
    const errors = {};

    if (!form.firstName.trim()) {
      errors.firstName = "First name is required.";
    } else if (!isValidName(form.firstName)) {
      errors.firstName =
        "Use letters, spaces, apostrophes, or hyphens for the name.";
    }

    if (form.middleName.trim() && !isValidName(form.middleName)) {
      errors.middleName =
        "Use letters, spaces, apostrophes, or hyphens for the name.";
    }

    if (!form.lastName.trim()) {
      errors.lastName = "Last name is required.";
    } else if (!isValidName(form.lastName)) {
      errors.lastName =
        "Use letters, spaces, apostrophes, or hyphens for the name.";
    }

    if (!isValidDateOfBirth(form.dateOfBirth)) {
      errors.dateOfBirth =
        "Enter a valid date of birth that is not in the future.";
    }

    const parsedPhone = parsePhoneNumberFromString(phoneInput, phoneCountry);
    if (!phoneInput.trim()) {
      errors.contactNumber = "Mobile number is required.";
    } else if (!parsedPhone?.isValid()) {
      errors.contactNumber =
        "Enter a valid mobile number for the selected country.";
    }

    const hasAddressDetails = Object.entries(form.address).some(
      ([field, value]) => field !== "country" && value.trim()
    );
    if (
      hasAddressDetails &&
      ["street", "cityMunicipality", "province", "country"].some(
        (field) => !form.address[field].trim()
      )
    ) {
      errors.address =
        "Complete the street, city or municipality, province, and country.";
    }

    setValidationErrors(errors);
    if (Object.keys(errors).length) {
      requestAnimationFrame(() => {
        const firstInvalid = document.querySelector('[aria-invalid="true"]');
        firstInvalid?.scrollIntoView({ behavior: "smooth", block: "center" });
        firstInvalid?.focus();
      });
    }
    return Object.keys(errors).length === 0;
  };

  const searchAddress = async () => {
    const query = addressQuery.trim();
    if (query.length < 3) {
      setAddressMessage("Enter at least 3 characters to search.");
      return;
    }

    setAddressSearchBusy(true);
    setAddressMessage("");
    try {
      const response = await apiRequest(
        `/users/address-search?query=${encodeURIComponent(query)}`
      );
      setAddressSuggestions(response.results);
      if (response.results.length === 0) {
        setAddressMessage(
          "No matching addresses found. You can enter the address manually."
        );
      }
    } catch (error) {
      setAddressMessage(error.message);
    } finally {
      setAddressSearchBusy(false);
    }
  };

  const selectAddress = (suggestion) => {
    setForm((current) => ({
      ...current,
      address: {
        houseBuildingNumber: suggestion.houseBuildingNumber || "",
        street: suggestion.street || "",
        barangay: suggestion.barangay || "",
        cityMunicipality: suggestion.cityMunicipality || "",
        province: suggestion.province || "",
        postalCode: suggestion.postalCode || "",
        country: suggestion.country || "",
      },
    }));
    syncPhoneCountry(suggestion.country);
    setAddressQuery(suggestion.displayName);
    setAddressSuggestions([]);
    setAddressMessage("");
    setValidationErrors((current) => ({ ...current, address: "" }));
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    setBusy(true);
    let pictureWarning = "";

    try {
      if (pictureFile) {
        const pictureBody = new FormData();
        pictureBody.append("profilePicture", pictureFile);
        const response = await apiRequest("/users/profile-picture", {
          method: "POST",
          body: pictureBody,
        });
        setUser((current) => ({ ...current, ...response.user }));
        pictureWarning = response.warning || "";
        if (picturePreviewRef.current) {
          URL.revokeObjectURL(picturePreviewRef.current);
          picturePreviewRef.current = "";
        }
        setPictureFile(null);
        setPicturePreview(response.user.profilePictureUrl);
        setPictureRemoved(false);
        setPictureFailed(false);
      } else if (pictureRemoved) {
        try {
          const response = await apiRequest("/users/profile-picture", {
            method: "DELETE",
          });
          setUser((current) => ({ ...current, ...response.user }));
          setPictureRemoved(false);
          setPicturePreview("");
        } catch (error) {
          setPictureRemoved(false);
          throw error;
        }
      }

      const parsedPhone = parsePhoneNumberFromString(phoneInput, phoneCountry);
      const response = await apiRequest("/users/complete-profile", {
        method: "PUT",
        body: JSON.stringify({
          firstName: form.firstName,
          middleName: form.middleName,
          lastName: form.lastName,
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          contactNumber: parsedPhone.number,
          address: form.address,
        }),
      });

      setUser((current) => ({ ...current, ...response.user }));
      navigate("/home", { replace: true });
      toast.success(response.message || "Profile completed.");
      if (pictureWarning) toast.error(pictureWarning);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  useEffect(
    () => () => {
      if (picturePreviewRef.current) {
        URL.revokeObjectURL(picturePreviewRef.current);
      }
    },
    []
  );

  return (
    <main
      className={`flex min-h-dvh items-start justify-center p-4 sm:p-8 ${styles.primaryBg} ${styles.primaryText}`}
    >
      <section
        className={`w-full max-w-2xl rounded-2xl border p-5 sm:p-8 ${styles.border} ${styles.secondaryBg} ${styles.profileSurfaceShadow}`}
      >
        <header>
          <p className={`text-xs font-semibold uppercase tracking-wider ${styles.blueText}`}>Account setup</p>
          <h1 className="mt-2 text-xl sm:text-2xl font-semibold tracking-tight">Complete your profile</h1>
          <p className={`mt-0.5 text-xs sm:text-sm ${styles.secondaryText}`}>
            Add your personal and contact details to finish setting up your account.
          </p>
        </header>

        <form onSubmit={submit} className="mt-8">
          <section aria-labelledby="personal-heading" className={`mt-9 border-t pt-7 ${styles.border}`}>
            <h2 id="personal-heading" className="text-xl font-semibold">
              Personal Information
            </h2>
            <div className="mt-5 flex flex-wrap items-center gap-4">
                {picturePreview && !pictureRemoved && !pictureFailed ? (
                  <img
                    src={picturePreview}
                    alt="Profile"
                    onError={() => setPictureFailed(true)}
                    className="size-24 rounded-full object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className={`grid size-20 place-items-center rounded-full text-2xl font-semibold ${styles.blueText} ${styles.profileAvatarBg}`}
                  >
                    {[user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join("").toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor="profile-picture">Profile picture (optional)</label>
                    <input
                      id="profile-picture"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handlePictureChange}
                      disabled={busy}
                      className="sr-only"
                    />
                    <label 
                      htmlFor="profile-picture" 
                      className={`flex items-center gap-2 cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold ${styles.buttonFrost} ${busy ? "pointer-events-none opacity-50" : ""}`}
                    >
                      <Upload className="size-4" />
                      Upload photo
                    </label>
                  {(pictureFile ||
                    (user?.profilePictureUrl && !pictureRemoved)) && (
                    <button
                      type="button"
                      onClick={handlePictureRemove}
                      className={`rounded-full border px-4 py-1.5 text-sm ${styles.redBorder} ${styles.redBg2}`}
                    >
                      {pictureFile
                        ? "Remove photo"
                        : "Remove photo"}
                    </button>
                  )}
                  {pictureRemoved && (
                    <button
                      type="button"
                      onClick={() => setPictureRemoved(false)}
                      className={`mt-2 text-sm ${styles.blueText}`}
                    >
                      Undo picture deletion
                    </button>
                  )}
                  <p className={`w-full text-[11px] ${styles.secondaryText}`}>JPEG, PNG, or WebP; up to 5 MB.</p>
                  {pictureError && <p className={`w-full text-sm ${styles.profileErrorText}`} role="alert">{pictureError}</p>}
                </div>
              </div>

              <div className="mt-6 grid gap-x-4 gap-y-4 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  First name <span aria-hidden="true" className={styles.profileErrorText}>*</span>
                  <input
                    value={form.firstName}
                    maxLength={80}
                    aria-required="true"
                    aria-invalid={Boolean(validationErrors.firstName)}
                    onBlur={() => { if (!form.firstName.trim()) setValidationErrors((e) => ({ ...e, firstName: "First name is required." })); }}
                    onChange={(event) => update("firstName", event.target.value)}
                    className={` w-full px-4 py-2 rounded-lg border text-sm transition ${styles.input} flex flex-col`}
                  />
                  {validationErrors.firstName && (
                    <span className={`mt-1.5 block text-sm ${styles.profileErrorText}`}>
                      {validationErrors.firstName}
                    </span>
                  )}
                </label>
                <label className="text-sm font-medium">
                  Middle name (optional)
                  <input
                    value={form.middleName}
                    maxLength={80}
                    aria-invalid={Boolean(validationErrors.middleName)}
                    onChange={(event) => update("middleName", event.target.value)}
                    className={` w-full px-4 py-2 rounded-lg border text-sm transition ${styles.input} flex flex-col`}
                  />
                  {validationErrors.middleName && (
                    <span className={`mt-1.5 block text-sm ${styles.profileErrorText}`}>
                      {validationErrors.middleName}
                    </span>
                  )}
                </label>
                <label className="text-sm font-medium">
                  Last name <span aria-hidden="true" className={styles.profileErrorText}>*</span>
                  <input
                    value={form.lastName}
                    maxLength={80}
                    aria-required="true"
                    aria-invalid={Boolean(validationErrors.lastName)}
                    onChange={(event) => update("lastName", event.target.value)}
                    className={` w-full px-4 py-2 rounded-lg border text-sm transition ${styles.input} flex flex-col`}
                  />
                  {validationErrors.lastName && (
                    <span className={`mt-1.5 block text-sm ${styles.profileErrorText}`}>
                      {validationErrors.lastName}
                    </span>
                  )}
                </label>
                <label className="text-sm font-medium">
                  Date of birth (optional)
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    max={today}
                    aria-invalid={Boolean(validationErrors.dateOfBirth)}
                    onChange={(event) =>
                      update("dateOfBirth", event.target.value)
                    }
                    className={` w-full px-4 py-2 rounded-lg border text-sm transition ${styles.input} flex flex-col`}
                  />
                  {validationErrors.dateOfBirth && (
                    <span className={`mt-1.5 block text-sm ${styles.profileErrorText}`}>
                      {validationErrors.dateOfBirth}
                    </span>
                  )}
                </label>
                <label className="text-sm font-medium ">
                  Gender (optional)
                  <select
                    value={form.gender}
                    onChange={(event) => update("gender", event.target.value)}
                    className={` w-full px-4 py-2 rounded-lg border text-sm transition ${styles.input} flex flex-col`}
                  >
                    <option value="">Select an option</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </label>

              </div>
          </section>

          <section className={`mt-9 border-t pt-7 ${styles.border}`} aria-labelledby="contact-heading">
              <h2 id="contact-heading" className="text-xl font-semibold">
                Contact Information
              </h2>
              <div className="mt-5 grid gap-4">
                <label className="text-sm font-medium">
                  Email address <span aria-hidden="true"></span>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className={` w-full read-only px-4 py-2 rounded-lg border text-sm transition ${styles.input} flex flex-col`}
                  />
                  <span className={`mt-1 block text-xs ${styles.secondaryText}`}>Email can’t be changed.</span>
                </label>
                <div>
                  <label className="text-sm font-medium" htmlFor="mobile-number">
                    Mobile number <span aria-hidden="true">*</span>
                  </label>
                  <div className="mt-1 grid gap-2 sm:grid-cols-[minmax(12rem,0.8fr)_2fr]">
                    <select
                      value={phoneCountry}
                      aria-label="Phone country code"
                      onChange={(event) => {
                        const country = event.target.value;
                        setPhoneCountry(country);
                        setPhoneInput((current) =>
                          new AsYouType(country).input(current)
                        );
                        setValidationErrors((current) => ({
                          ...current,
                          contactNumber: "",
                        }));
                      }}
                      className={` w-full px-4 py-2 rounded-lg border text-sm transition ${styles.input} flex flex-col`}
                    >
                      {countries.map(({ code, name }) => (
                        <option key={code} value={code}>
                          {name} (+{getCountryCallingCode(code)})
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={phoneInput}
                      id="mobile-number"
                      aria-required="true"
                      aria-invalid={Boolean(validationErrors.contactNumber)}
                      aria-describedby="mobile-number-format"
                      placeholder={phoneCountry === "PH" ? "e.g. 917 123 4567" : "Mobile number"}
                      onChange={(event) => {
                        setPhoneInput(
                          new AsYouType(phoneCountry).input(event.target.value)
                        );
                        setValidationErrors((current) => ({
                          ...current,
                          contactNumber: "",
                        }));
                      }}
                    className={` w-full px-4 py-2 rounded-lg border text-sm transition ${styles.input} flex flex-col`}
                    />
                  </div>
                  {validationErrors.contactNumber && (
                    <p className={`mt-1.5 text-sm ${styles.profileErrorText}`}>
                      {validationErrors.contactNumber}
                    </p>
                  )}
                  <p
                    id="mobile-number-format"
                    className={`mt-1.5 text-xs ${styles.secondaryText}`}
                  >
                    The address country is selected by default. You can choose a different phone country here.
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h3 className={`mt-8 border-t pt-6 text-xl font-semibold ${styles.border}`}>Complete address (optional)</h3>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={addressQuery}
                    onChange={(event) => {
                      setAddressQuery(event.target.value);
                      setAddressSuggestions([]);
                      setAddressMessage("");
                    }}
                    placeholder="Search street, barangay, city, or municipality"
                    className={` w-full px-4 py-2 rounded-lg border text-sm transition ${styles.input} flex flex-col`}
                  />
                  <button
                    type="button"
                    onClick={searchAddress}
                    disabled={addressSearchBusy || busy}
                    className={`shrink-0 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60 ${styles.buttonBlue}`}
                  >
                    {addressSearchBusy ? "Searching…" : "Search address"}
                  </button>
                </div>
                {addressMessage && (
                  <p className={`mt-2 text-sm ${styles.profileErrorText}`} role="status">
                    <span>{addressMessage}</span> 
                  </p>
                )}
                {addressSuggestions.length > 0 && (
                  <ul
                    className={`mt-2 divide-y rounded-md border ${styles.border}`}
                  >
                    {addressSuggestions.map((suggestion) => (
                      <li
                        key={`${suggestion.placeId}-${suggestion.displayName}`}
                      >
                        <button
                          type="button"
                          onClick={() => selectAddress(suggestion)}
                          className={`w-full flex items-start gap-4 px-3 py-2 text-left text-sm ${styles.secondaryBgHover}`}
                        >
                          {suggestion.displayName} <SquareArrowUpRightExit className={`h-4 w-4 ${styles.headerNavText}`} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {validationErrors.address && (
                  <p className={`mt-2 text-sm ${styles.profileErrorText}`} role="alert">
                    {validationErrors.address}
                  </p>
                )}
                <div className="mt-5 grid gap-x-5 gap-y-5 sm:grid-cols-2">
                  <label className="text-sm font-medium sm:col-span-2">
                    Country
                    <select value={form.address.country} onChange={(event) => {
                      const selectedCountry = event.target.value;
                      setForm((current) => ({ ...current, address: { country: selectedCountry, province: "", cityMunicipality: "", barangay: "", street: "", houseBuildingNumber: "", postalCode: "" } }));
                      syncPhoneCountry(selectedCountry);
                      setValidationErrors((current) => ({ ...current, address: "" }));
                    }} 
                    className={` w-full px-4 py-2 rounded-lg border text-sm transition ${styles.input} flex flex-col`}
                    >
                      <option value="">Select a country</option>
                      {countries.map(({ code, name }) => <option key={code} value={name}>{name}</option>)}
                    </select>
                  </label>
                  {addressFields.map(([key, label]) => (
                    <label key={key} className="text-sm font-medium">
                      {label}
                      <input
                        value={form.address[key]}
                        maxLength={key === "postalCode" ? 20 : 120}
                        onChange={(event) =>
                          updateAddress(key, event.target.value)
                        }
                    className={` w-full px-4 py-2 rounded-lg border text-sm transition ${styles.input} flex flex-col`}
                      />
                    </label>
                  ))}
                </div>
              </div>
          </section>
          <div className={`sticky bottom-0 z-10 -mx-5 mt-8 flex flex-wrap items-center justify-end gap-2 border-t px-4 py-4 sm:static sm:mx-0 sm:px-0 sm:pb-0 sm:pt-5 ${styles.border} ${styles.secondaryBg}`}>
            <button
              type="button"
              onClick={cancelChanges}
              disabled={busy}
              className={`rounded-lg px-5 py-2 text-sm font-semibold ${styles.buttonFrost}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || addressSearchBusy}
              className={`inline-flex  items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${styles.buttonBlue}`}
            >
              {busy && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
              {busy ? "Saving profile…" : "Save profile"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
