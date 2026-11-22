import { motion, useReducedMotion } from "motion/react";
import { useDarkMode } from "../theme/DarkModeContext";

export const DURATION = 24;
export const LINES_PER_STRAND = 12;

const WIDTH = 1200;
const HEIGHT = 700;
const SAMPLE_COUNT = 25;
const PHASES = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2, Math.PI * 2];
const STRAND_COLORS = [
    "stroke-sky-200",
    "stroke-sky-400",
    "stroke-blue-300",
    "stroke-blue-500",
];

function toBezierPath(points, close = false) {
    if (points.length < 2) return "";

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let index = 0; index < points.length - 1; index += 1) {
        const previous = points[index - 1] ?? points[index];
        const current = points[index];
        const next = points[index + 1];
        const following = points[index + 2] ?? next;
        const control1 = {
            x: current.x + (next.x - previous.x) / 6,
            y: current.y + (next.y - previous.y) / 6,
        };
        const control2 = {
            x: next.x - (following.x - current.x) / 6,
            y: next.y - (following.y - current.y) / 6,
        };

        path += ` C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${next.x} ${next.y}`;
    }

    return close ? `${path} Z` : path;
}

function getWavePoints(phase, amplitude, offset, phaseLag) {
    return Array.from({ length: SAMPLE_COUNT }, (_, index) => {
        const x = -100 + (index * (WIDTH + 200)) / (SAMPLE_COUNT - 1);
        const angle = (x / WIDTH) * Math.PI * 2 + phase + phaseLag;

        return {
            x,
            y: HEIGHT / 2 + offset + Math.sin(angle) * amplitude,
        };
    });
}

function getLineKeyframes(amplitude, offset, phaseLag) {
    return PHASES.map((phase) =>
        toBezierPath(getWavePoints(phase, amplitude, offset, phaseLag)),
    );
}

function getRibbonKeyframes() {
    return PHASES.map((phase) => {
        const upper = getWavePoints(phase, 115, -12, 0);
        const lower = getWavePoints(phase, 115, 12, 0).reverse();
        return toBezierPath([...upper, ...lower], true);
    });
}

const RIBBON_KEYFRAMES = getRibbonKeyframes();
const STRANDS = [0, 1].map((strandIndex) =>
    Array.from({ length: LINES_PER_STRAND }, (_, lineIndex) => {
        const progress = lineIndex / (LINES_PER_STRAND - 1);

        return {
            key: `${strandIndex}-${lineIndex}`,
            keyframes: getLineKeyframes(
                80 + progress * 75,
                (progress - 0.5) * 62 + (strandIndex === 0 ? -19 : 19),
                (progress - 0.5) * 0.46 + strandIndex * 0.18,
            ),
            opacity: 0.55 + (1 - Math.abs(progress - 0.5) * 2) * 0.35,
            color: STRAND_COLORS[lineIndex % STRAND_COLORS.length],
        };
    }),
);

export default function WaveBackground() {
    const shouldReduceMotion = useReducedMotion();
    const { darkMode } = useDarkMode();
    const lineColors = darkMode
        ? [
              "stroke-blue-400",
              "stroke-blue-500",
              "stroke-indigo-400",
              "stroke-blue-700",
          ]
        : STRAND_COLORS;

    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
        >
            <motion.div
                className="absolute left-[-5%] top-1/2 h-[80%] w-[110%] -translate-y-1/2 opacity-60"
                style={{
                    maskImage:
                        "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
                    WebkitMaskImage:
                        "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
                }}
                animate={shouldReduceMotion ? undefined : { x: [-10, 10] }}
                transition={{
                    duration: 18,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "mirror",
                }}
            >
                <svg
                    className="h-full w-full blur-3xl"
                    viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                    preserveAspectRatio="none"
                >
                    <motion.path
                        d={RIBBON_KEYFRAMES[0]}
                        fill="currentColor"
                        className={darkMode ? "text-blue-800" : "text-sky-200"}
                        animate={
                            shouldReduceMotion
                                ? undefined
                                : { d: RIBBON_KEYFRAMES }
                        }
                        transition={{
                            duration: DURATION,
                            ease: "linear",
                            repeat: Infinity,
                        }}
                    />
                </svg>
            </motion.div>

            <motion.svg
                className={`absolute left-[-5%] top-1/2 h-[80%] w-[110%] -translate-y-1/2 ${darkMode ? "opacity-60" : "opacity-70"} [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)] will-change-transform`}
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                preserveAspectRatio="none"
                style={{ transformOrigin: "50% 50%" }}
                animate={
                    shouldReduceMotion
                        ? undefined
                        : { scaleY: [1, 1.06, 0.95, 1] }
                }
                transition={{
                    duration: 30,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "mirror",
                }}
            >
                {STRANDS.flatMap((strand) =>
                    strand.map((line) => (
                        <motion.path
                            key={line.key}
                            d={line.keyframes[0]}
                            fill="none"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                            className={lineColors[Number(line.key.split("-")[1]) % lineColors.length]}
                            style={{ opacity: line.opacity }}
                            animate={
                                shouldReduceMotion
                                    ? undefined
                                    : { d: line.keyframes }
                            }
                            transition={{
                                duration: DURATION,
                                ease: "linear",
                                repeat: Infinity,
                            }}
                        />
                    )),
                )}
            </motion.svg>
        </div>
    );
}
