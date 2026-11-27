import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import fetchLearningActivitySummary from "../utils/learningActivitySummary";

export default function useLearningActivitySummary() {
  const { apiRequest, user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [loadedUserId, setLoadedUserId] = useState("");
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => { setStatus("loading"); setError(""); setRevision((value) => value + 1); }, []);
  useEffect(() => {
    let active = true;
    fetchLearningActivitySummary(apiRequest)
      .then((value) => { if (active) { setSummary(value); setLoadedUserId(user?.id || ""); setStatus("success"); } })
      .catch((reason) => { if (active) { setLoadedUserId(user?.id || ""); setError(reason.message || "Could not load learning progress."); setStatus("error"); } });
    return () => { active = false; };
  }, [apiRequest, revision, user?.id]);
  const sameUser = loadedUserId === (user?.id || "");
  return { summary: sameUser ? summary : null, status: sameUser ? status : "loading", error: sameUser ? error : "", retry };
}
