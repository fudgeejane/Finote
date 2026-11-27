export function activityRequest(type, referenceId, eventId) {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    return { method: "POST", body: JSON.stringify({ type, referenceId, eventId, timezone }) };
}

