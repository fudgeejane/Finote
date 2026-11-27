import { BookOpen, ClipboardList } from "lucide-react";
import Styling from "../../theme/Styling";

export default function NotesActionsFooter({ onStudy }) {

    const styles = Styling();

    return (
    <footer 
        className={`sticky bottom-0 z-10 mt-auto hidden shrink-0 gap-2 border-t ${styles.border} ${styles.secondaryBg} 
        p-3 max-[1023px]:flex max-[639px]:gap-2 max-[639px]:px-4 max-[639px]:pb-[calc(env(safe-area-inset-bottom)+12px)]`}
    >
        <button 
            type="button" 
            onClick={() => onStudy("flashcards")} 
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs ${styles.buttonFrost}`}
        >
            <BookOpen size={14}/>Flashcards
        </button>
        <button 
            type="button" 
            onClick={() => onStudy("mock-exams")} 
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs ${styles.buttonFrost}`}
        >
            <ClipboardList size={14}/>Mock Exam
        </button>
    </footer>);
}
