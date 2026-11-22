import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToHash() {
    const { hash, pathname } = useLocation();

    useEffect(() => {
        if (hash) {
            const timer = setTimeout(() => {
                const targetId = decodeURIComponent(hash.slice(1));
                document
                    .getElementById(targetId)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 0);
            return() =>  clearTimeout(timer);
        }
        window.scrollTo(0, 0);
    }, [hash, pathname]);

    return null;
}