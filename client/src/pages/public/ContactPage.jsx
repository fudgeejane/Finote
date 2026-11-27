import Styling from "../../components/theme/Styling";

export default function ContactPage() {
    const styles = Styling();


    return (
        <div className="flex flex-col p-4 sm:p-6 md:p-8 min-h-dvh">
            {/* Header */}
            <header className="mx-auto mb-8 max-w-2xl text-center sm:mb-16">
                <h1
                    className={`text-3xl font-medium leading-tight tracking-tight sm:text-4xl lg:text-5xl ${styles.blueText}`}
                >
                    We'd love to <span className="font-serif italic">hear from you</span>
                </h1>
                <p
                    className={`mx-auto mt-4 max-w-md text-sm leading-6 sm:text-base sm:leading-7 ${styles.secondaryText}`}
                >
                    Have a question, an idea, or ran into a problem? Send us a message and we'll
                    get back to you as soon as we can.
                </p>
            </header>

            {/* Contact form */}
            <form className={`mx-auto w-full max-w-xl space-y-4 `}>
                <div>
                    <label htmlFor="subject" className="mb-1.5 block text-sm font-medium">
                        Subject
                    </label>
                    <input
                        id="subject"
                        type="text"
                        placeholder="What's this about?"
                        className={`w-full px-4 py-2.5 rounded-md border ${styles.input}`}
                    />
                </div>

                <div>
                    <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                        Your Name
                    </label>
                    <input
                        id="name"
                        type="text"
                        placeholder="Juan Dela Cruz"
                        className={`w-full px-4 py-2.5 rounded-md border ${styles.input}`}
                    />
                </div>

                <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        className={`w-full px-4 py-2.5 rounded-md border ${styles.input}`}
                    />
                </div>

                <div>
                    <label htmlFor="message" className="mb-1.5 block text-sm font-medium">
                        Message
                    </label>
                    <textarea
                        id="message"
                        rows={6}
                        placeholder="Write your message here..."
                        className={`w-full px-4 py-2.5 rounded-md border ${styles.input}`}
                    />
                </div>

                <button
                    type="submit"
                    className="w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                    Send
                </button>
            </form>
        </div>
    );
}
