import Nav from "@/components/Nav";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollEffects from "@/components/ScrollEffects";
import SectionProgress from "@/components/SectionProgress";
import LoadingBadge from "@/components/LoadingBadge";
import SceneLoader from "@/components/three/SceneLoader";
import Hero from "@/components/sections/Hero";
import Design from "@/components/sections/Design";
import Configurator from "@/components/sections/Configurator";
import Performance from "@/components/sections/Performance";
import Inside from "@/components/sections/Inside";
import Cargo from "@/components/sections/Cargo";
import Reserve from "@/components/sections/Reserve";
import Footer from "@/components/sections/Footer";

/*
 * This page is a Server Component: the section text is rendered to plain HTML
 * on the server, which is fast and SEO-friendly. Only the interactive pieces
 * (3D scene, scroll, configurator) are "use client" components.
 *
 * Section order matters: it must match CAMERA_STOPS and SECTIONS in
 * lib/poses.ts, because each block drives one step of the camera's orbit.
 */
export default function Home() {
  return (
    <>
      <SmoothScroll />
      <ScrollEffects />
      <SceneLoader />
      <Nav />
      <SectionProgress />
      <LoadingBadge />

      <main>
        <Hero />
        <Design />
        <Inside />
        <Cargo />
        <Configurator />
        <Performance />
        <Reserve />
      </main>

      <Footer />
    </>
  );
}
