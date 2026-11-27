export default function fetchLearningActivitySummary(apiRequest) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  return apiRequest(`/learning-activity?timezone=${encodeURIComponent(timezone)}`);
}
