import type { Section, SectionProgress, GuidedStep } from "../engine/sections";

interface Props {
  sections: Section[];
  progress: SectionProgress[];
  currentSectionIndex: number;
  guidedStep: GuidedStep;
  onJumpToSection: (sectionIndex: number) => void;
  onMarkLearned: (sectionIndex: number) => void;
}

const MASTERY_COLORS: Record<string, string> = {
  new: "bg-n-700 text-n-400",
  practiced: "bg-yellow-dark text-yellow-light",
  learned: "bg-brand-green-dark text-brand-green-light",
};

const MASTERY_LABELS: Record<string, string> = {
  new: "New",
  practiced: "Practiced",
  learned: "Learned",
};

const STEP_MESSAGES: Record<GuidedStep, string> = {
  "right-hand": "Try right hand first",
  "left-hand": "Now try left hand",
  "both-hands": "Both hands together",
  "next-section": "Move to next section",
  complete: "Song complete!",
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SectionsPanel({
  sections,
  progress,
  currentSectionIndex,
  guidedStep,
  onJumpToSection,
  onMarkLearned,
}: Props) {
  return (
    <div className="w-52 bg-n-800 border-l border-n-700 flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-n-700">
        <p className="text-xs text-yellow-base font-medium">
          {STEP_MESSAGES[guidedStep]}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sections.map((section, i) => {
          const prog = progress[i];
          const isCurrent = i === currentSectionIndex;

          return (
            <div
              key={i}
              className={`px-3 py-2 border-b border-n-700/50 cursor-pointer hover:bg-n-700/50 ${
                isCurrent ? "bg-n-700/80 border-l-2 border-l-purple-light" : ""
              }`}
              onClick={() => onJumpToSection(i)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium ${isCurrent ? "text-white" : "text-n-300"}`}>
                  Section {i + 1}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${MASTERY_COLORS[prog.mastery]}`}>
                  {MASTERY_LABELS[prog.mastery]}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-[10px] text-n-500">
                  m{section.startMeasure + 1}-{section.endMeasure + 1} &middot; {formatTime(prog.practiceTimeSec)}
                </div>

                {prog.mastery === "learned" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-brand-green-base shrink-0">
                    <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2" />
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : isCurrent ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkLearned(i);
                    }}
                    className="shrink-0 text-n-500 hover:text-brand-green-base transition-colors"
                    title="Mark as Learned"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                      <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-3 py-2 border-t border-n-700 text-[10px] text-n-500">
        {progress.filter((p) => p.mastery === "learned").length}/{sections.length} learned
      </div>
    </div>
  );
}
