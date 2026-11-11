import { About } from "@/components/sections/About";
import { Experience } from "@/components/sections/Experience";
import { Hero } from "@/components/sections/Hero";

export default function Home() {
  return (
    <main id="main">
      <Hero />
      <About />
      <Experience />
    </main>
  );
}
