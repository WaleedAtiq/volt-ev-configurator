import type { ReactNode } from "react";

/*
 * One chapter of the scroll story: text on one side, the 3D car on the other
 * (the camera stop with the same id in lib/poses.ts frames the car there).
 * Chapters are 1.7 screens tall with the text pinned (.chapter in globals.css),
 * so each camera move has time to arrive and then hold while you read.
 */
type Props = {
  id: string;
  eyebrow: string;
  title: string;
  text: string;
  chips?: string[];
  side?: "left" | "right";
  children?: ReactNode; // extra content under the text (e.g. a feature list)
};

export default function Chapter({ id, eyebrow, title, text, chips = [], side = "left", children }: Props) {
  return (
    <div id={id} className="chapter">
      <div className={`chapter-inner ${side === "right" ? "desktop:justify-end" : ""}`}>
        <div className="reveal w-full desktop:w-[40%]">
          <div className="eyebrow">{eyebrow}</div>
          <h2 className="heading">{title}</h2>
          <p className="lead">{text}</p>
          {chips.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <li key={chip} className="rounded-full border border-line bg-bg/50 px-3.5 py-1.5 text-[12px] text-ink backdrop-blur">
                  {chip}
                </li>
              ))}
            </ul>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
