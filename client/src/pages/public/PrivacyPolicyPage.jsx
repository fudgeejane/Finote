import Styling from "../../components/theme/Styling";
import { privacySections } from "../../data/legalContent";

export default function PrivacyPolicyPage() {
    const styles = Styling();

    return (
        <div className="max-w-3xl mx-auto p-4 sm:p-6 md:p-8">
            <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl mb-2 font-semibold">Privacy Policy</h1>
            <p className={`text-sm sm:text-base pb-6 border-b mb-6 ${styles.border} ${styles.secondaryText}`}>
                Information about Finote&apos;s data practices, including collection, use, storage, sharing, and user choices.
            </p>
           

            <ol className="list-decimal list-inside">
                {privacySections.map(({ title, paragraphs }) => (
                    <li key={title} className="mb-4">
                        <span className="font-semibold">{title}</span>
                        {paragraphs.map((paragraph, paragraphIndex) => (
                            <p
                                key={paragraphIndex}
                                className={`mt-2 ml-4 text-sm sm:text-base leading-7 ${styles.secondaryText}`}
                            >
                                {paragraph}
                            </p>
                        ))}
                    </li>
                ))}
            </ol>
        </div>
    );
}