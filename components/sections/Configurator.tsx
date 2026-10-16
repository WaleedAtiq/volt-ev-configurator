import ConfiguratorPanel from "./ConfiguratorPanel";
import DragToRotate from "./DragToRotate";

// The car is drawn by the 3D canvas behind the page. In this section the
// camera swings round to a side-on 3/4 view, on the left (desktop) or above
// the panel (mobile). The invisible drag area sits exactly over that spot.
export default function Configurator() {
  return (
    <section id="configure" className="section desktop:justify-end">
      <DragToRotate className="absolute inset-x-0 top-0 h-[48svh] desktop:inset-y-0 desktop:right-auto desktop:h-auto desktop:w-[60%]" />
      <div className="relative w-full desktop:w-[440px]">
        <div className="eyebrow">04 — Configurator</div>
        <h2 className="heading">Make it yours.</h2>
        <p className="lead hidden desktop:block">
          Pick a paint, wheels and trim, then change the world around it. Drag the car to walk around it.
        </p>
        <ConfiguratorPanel />
      </div>
    </section>
  );
}
