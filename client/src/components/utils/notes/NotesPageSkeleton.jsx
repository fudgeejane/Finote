export default function NotesPageSkeleton({ styles }) {
    const bar = "animate-pulse rounded-md bg-gray-500/15";
    const tool = "h-8 w-8 shrink-0 animate-pulse rounded-md bg-gray-500/15";

    return (
        <div
            role="status"
            aria-label="Loading notes"
            aria-busy="true"
            className="mx-auto flex h-[calc(100dvh-140px)] min-h-[520px] w-full overflow-hidden [font-family:Inter,sans-serif] max-[1023px]:h-[calc(100dvh-140px)] max-[1023px]:min-h-[520px] max-[1023px]:gap-0 max-[639px]:-mx-4 max-[639px]:w-[calc(100%+2rem)] max-[639px]:h-[calc(100dvh-120px)] max-[639px]:min-h-0"
        >
            <span className="sr-only">Loading notes…</span>
            <div className="grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)] gap-2.5 max-[1023px]:grid-cols-1 max-[1023px]:gap-0">
                <aside aria-hidden="true" className={`hidden min-h-0 flex-col rounded-xl border p-3 lg:flex ${styles.border} ${styles.secondaryBg}`}>
                    <div className="mb-4 flex items-center justify-between p-1">
                        <div className="space-y-2">
                            <div className={`${bar} h-7 w-32`} />
                            <div className={`${bar} h-3 w-14`} />
                        </div>
                        <div className={`${bar} h-9 w-9 rounded-full`} />
                    </div>
                    <div className="flex gap-2 px-1 pb-3">
                        <div className={`${bar} h-10 flex-1 rounded-md`} />
                        <div className={`${bar} h-10 w-10 rounded-md`} />
                    </div>
                    <div className="space-y-2 px-1">
                        {[0, 1, 2, 3].map((item) => (
                            <div key={item} className="space-y-2 rounded-xl px-3 py-3">
                                <div className={`${bar} h-4 w-3/4`} />
                                <div className={`${bar} h-3 w-full`} />
                            </div>
                        ))}
                    </div>
                </aside>

                <main aria-hidden="true" className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border ${styles.border} ${styles.secondaryBg}`}>
                    <header className={`relative z-10 flex min-h-16 flex-wrap items-center justify-center gap-2 border-b px-4 py-2 max-[639px]:min-h-14 ${styles.border} ${styles.primaryBg}`}>
                        <div className="order-1 flex w-full items-center justify-between gap-2 lg:absolute lg:inset-x-4 lg:top-2 lg:w-auto">
                            <div className={`${bar} hidden h-10 w-28 rounded-lg max-[1023px]:block max-[639px]:hidden`} />
                            <div className={`${bar} hidden h-10 w-20 rounded-lg max-[639px]:block`} />
                        </div>
                        <div className="order-2 w-full overflow-hidden max-[639px]:overflow-x-auto max-[639px]:[scrollbar-width:none]">
                            <div className="mx-auto flex w-max max-w-full flex-nowrap items-center gap-1 py-1.5 max-[639px]:mx-0 max-[639px]:max-w-none">
                                <div className={`${bar} h-9 w-[72px] shrink-0 rounded-lg`} />
                                <div className={`${bar} h-9 w-14 shrink-0 rounded-lg`} />
                                <span className={`mx-1 h-6 border-l ${styles.border}`} />
                                {[0, 1, 2, 3].map((item) => <div key={item} className={tool} />)}
                                <span className={`mx-1 h-6 border-l ${styles.border}`} />
                                {[4, 5, 6].map((item) => <div key={item} className={tool} />)}
                                <span className={`mx-1 h-6 border-l ${styles.border}`} />
                                <div className={`${bar} h-9 w-24 shrink-0 rounded-lg`} />
                                <div className={`${bar} h-9 w-9 shrink-0 rounded-lg`} />
                            </div>
                        </div>
                    </header>

                    <section className={`modal-scroll flex min-h-0 flex-1 flex-col items-center overflow-hidden overflow-y-auto px-5 py-6 text-[var(--text-body)] max-[1023px]:px-6 max-[1023px]:py-7 max-[639px]:px-5 max-[639px]:py-[22px]`}>
                        <div className="w-full max-w-[700px]">
                            <div className={`${bar} h-10 w-3/4 max-w-2xl`} />
                            <div className={`mt-5 h-px w-full border-t ${styles.border}`} />
                            <div className="mt-6 space-y-3">
                                {["w-full", "w-11/12", "w-4/5"].map((width, item) => <div key={item} className={`${bar} h-4 ${width}`} />)}
                            </div>
                            <div className={`${bar} mt-8 h-7 w-52`} />
                            <div className="mt-4 space-y-4 pl-4 sm:pl-6">
                                {["w-full", "w-11/12", "w-4/5"].map((width, item) => (
                                    <div key={item} className="flex items-center gap-3">
                                        <div className={`${bar} h-2 w-2 shrink-0 rounded-full`} />
                                        <div className={`${bar} h-4 ${width}`} />
                                    </div>
                                ))}
                            </div>
                            <div className={`${bar} mt-8 h-7 w-56`} />
                            <div className="mt-4 space-y-4">
                                {["w-full", "w-10/12", "w-3/4", "w-11/12", "w-2/3"].map((width, item) => <div key={item} className={`${bar} h-4 ${width}`} />)}
                            </div>
                        </div>
                    </section>

                    <footer className={`hidden shrink-0 gap-2 border-t p-3 max-[1023px]:flex ${styles.border} ${styles.secondaryBg}`}>
                        <div className={`${bar} h-9 w-32 rounded-md`} />
                        <div className={`${bar} h-9 w-32 rounded-md`} />
                    </footer>
                </main>
            </div>
        </div>
    );
}
