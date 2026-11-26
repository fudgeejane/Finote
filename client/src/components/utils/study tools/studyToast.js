import { createElement } from "react";
import toast from "react-hot-toast";
import StudyToast from "./studyToast";

export default function showStudyToast(message, options = {}) {
    return toast.custom((item) => createElement(StudyToast, {
        toastId: item.id,
        message,
        kind: options.kind || "success",
        actionLabel: options.actionLabel,
        onAction: options.onAction,
    }), { duration: options.duration || 6000 });
}
