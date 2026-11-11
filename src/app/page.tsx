import { About } from "@/components/sections/About";
import { Experience } from "@/components/sections/Experience";
import { Work } from "@/components/sections/Work";
import { WorkIndex } from "@/components/sections/WorkIndex";
import { Hero } from "@/components/sections/Hero";

export default function Home() {
  return (
    <main id="main">
      <Hero />
      <About />
      <Experience />
      <Work />
      <WorkIndex />
    </main>
  );
}
