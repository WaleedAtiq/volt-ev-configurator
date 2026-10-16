import Chapter from "./Chapter";
import FeatureList from "./FeatureList";

/*
 * Interior: the scissor doors rise ("doors"), then the camera flies in through
 * the open door into the driver's seat while the dashboard wakes up ("interior").
 * See the "doors" / "interior" camera stops in lib/poses.ts and story.ts.
 */
export default function Inside() {
  return (
    <section id="inside" aria-label="Interior">
      <Chapter
        id="doors"
        eyebrow="02 — Interior / 01 Doors"
        title="Doors that rise to meet you."
        text="Walk up and the scissor doors lift on silent hydraulics, the hazards flashing hello. No handles, no pulling: the car knows it's you."
        chips={["Scissor doors", "Phone-as-key"]}
      />
      <Chapter
        id="interior"
        eyebrow="02 — Interior / 02 Cabin"
        title="Take the center seat."
        text="A central driving position puts you on the car's axis, with a clean display that wakes up the moment you sit down."
      >
        {/* Phones: the cabin view fills the screen, so only the short intro is shown over it. */}
        <div className="hidden desktop:block">
          <FeatureList
            big="410 mi"
            bigCaption="Range, right there on the display"
            items={[
              { title: "Central driving position", text: "Perfect visibility to both sides, like a race car." },
              { title: "Recycled, vegan materials", text: "Seats in recycled-bottle knit or tanned leather, trim in reclaimed aluminum." },
              { title: "Over-the-air updates", text: "New features and more range arrive while the car sleeps." },
            ]}
          />
        </div>
      </Chapter>
    </section>
  );
}
