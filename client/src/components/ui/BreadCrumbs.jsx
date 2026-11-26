import { ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import Styling from "../theme/Styling";

const breadcrumbByRoute = [
    {
        matches: (path) => path === "/notes",
        maxWidth: "max-w-7xl",
        items: [{ label: "My Notes" }],
    },
    {
        matches: (path) => path === "/study-tools",
        maxWidth: "max-w-7xl",
        items: [{ label: "Study tools" }],
    },
    {
        matches: (path) => path.startsWith("/flashcards/"),
        maxWidth: "max-w-7xl",
        items: [
            { label: "Study tools", to: "/study-tools?tab=flashcards" },
            { label: "Flashcards" },
        ],
    },
    {
        matches: (path) => path.startsWith("/mock-exams/"),
        maxWidth: "max-w-7xl",
        items: [
            { label: "Study tools", to: "/study-tools?tab=mock-exams" },
            { label: "Mock exams" },
        ],
    },
    {
        matches: (path) => path === "/progress",
        maxWidth: "max-w-7xl",
        items: [{ label: "Learning progress" }],
    },
    {
        matches: (path) => path === "/settings",
        maxWidth: "max-w-7xl",
        items: [{ label: "Settings" }],
    },
    {
        matches: (path) => path === "/schedule",
        maxWidth: "max-w-7xl",
        items: [{ label: "My Schedule" }],
    },
];

export default function BreadCrumbs() {
    const styles = Styling();
    const { pathname } = useLocation();

    if (pathname === "/home" || pathname === "/") return null;
    const currentRoute = breadcrumbByRoute.find(({ matches }) => matches(pathname));
    if (!currentRoute) return null;

    const items = [
        { label: "Home", to: "/home"},
        ...currentRoute.items,
    ];

    return (
        <nav aria-label="Breadcrumb" className={`mx-auto mb-4 w-full ${currentRoute.maxWidth} ${styles.primaryText}`}>
            <ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
                {items.map((item, index) => {
                    const isCurrent = index === items.length - 1;
                    const ItemIcon = item.icon;
                    return (
                        <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2">
                            {index > 0 && (
                                <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${styles.tertiaryText}`} aria-hidden="true" />
                            )}
                            {item.to && !isCurrent ? (
                                <Link
                                    to={item.to}
                                    className={`inline-flex min-w-0 items-center gap-1.5 rounded-sm ${styles.secondaryText} transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500`}
                                >
                                    {ItemIcon && <ItemIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                                    <span className="truncate">{item.label}</span>
                                </Link>
                            ) : (
                                <span
                                    aria-current="page"
                                    className={`inline-flex min-w-0 items-center gap-1.5 font-medium ${styles.primaryText}`}
                                >
                                    {ItemIcon && <ItemIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                                    <span className="truncate">{item.label}</span>
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
