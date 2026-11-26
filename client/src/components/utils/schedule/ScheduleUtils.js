export const DAYS = [
  { key: "Mon", label: "Monday" },
  { key: "Tue", label: "Tuesday" },
  { key: "Wed", label: "Wednesday" },
  { key: "Thu", label: "Thursday" },
  { key: "Fri", label: "Friday" },
  { key: "Sat", label: "Saturday" },
  { key: "Sun", label: "Sunday" },
];

export const minute = (time) => {
  const [h, m] = String(time || "0:0").split(":").map(Number);
  return h * 60 + m;
};

export const timeLabel = (time) => {
  const [h, m] = String(time || "0:0").split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

export function getTodayClasses(classes, date) {
  const key = DAYS[(date.getDay() + 6) % 7].key;
  return classes.filter((item) => item.days?.includes(key)).sort((a, b) => minute(a.startTime) - minute(b.startTime));
}

export function getNextClass(classes, now) {
  const todayKey = DAYS[(now.getDay() + 6) % 7].key;
  const currentMinute = now.getHours() * 60 + now.getMinutes();
  const inProgress = classes
    .filter((item) => item.days?.includes(todayKey) && minute(item.startTime) <= currentMinute && currentMinute < minute(item.endTime))
    .sort((a, b) => minute(a.endTime) - minute(b.endTime))[0];
  if (inProgress) return { item: inProgress, status: "In Progress", date: now.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) };

  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const key = DAYS[(date.getDay() + 6) % 7].key;
    const cutoff = offset === 0 ? currentMinute : -1;
    const candidate = classes
      .filter((item) => item.days?.includes(key) && minute(item.startTime) > cutoff)
      .sort((a, b) => minute(a.startTime) - minute(b.startTime))[0];
    if (candidate) return { item: candidate, status: "Next Class", date: date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) };
  }
  return null;
}

export function countOccurrencesThisWeek(classes) {
  return classes.reduce((total, item) => total + (item.days || []).filter((key) => DAYS.some((day) => day.key === key)).length, 0);
}
