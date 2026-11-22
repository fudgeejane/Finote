import { useEffect, useState } from "react";
import Styling from "../theme/Styling";

export default function LoadingPage() {
  const [visible, setVisible] = useState(true);
  const styles = Styling();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setVisible(false), 1500);
    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!visible) return null;

  return (
    <div className={`fixed inset-0 z-[10001] flex items-center justify-center ${styles.primaryBg}`} role="status" aria-label="Loading Finote">
      <div className="flex items-center">
        <span className={`bar ${styles.blueText}`} />
        <span className={`bar ${styles.blueText}`} />
        <span className={`bar ${styles.blueText}`} />
      </div>

      <style>{`
        .bar {
          display: inline-block;
          width: 3px;
          height: 20px;
          background-color: currentColor;
          border-radius: 10px;
          animation: scale-up4 1s linear infinite;
        }

        .bar:nth-child(2) {
          height: 35px;
          margin: 0 5px;
          animation-delay: 0.25s;
        }

        .bar:nth-child(3) {
          animation-delay: 0.5s;
        }

        @keyframes scale-up4 {
          20% {
            transform: scaleY(1.5);
          }

          40% {
            transform: scaleY(1);
          }
        }
      `}</style>
    </div>
  );
}
