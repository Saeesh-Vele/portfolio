import { About } from "@/components/sections/About";
import { Capabilities } from "@/components/sections/Capabilities";
import { Contact } from "@/components/sections/Contact";
import { Experience } from "@/components/sections/Experience";
import { Recognition } from "@/components/sections/Recognition";
import { Work } from "@/components/sections/Work";
import { WorkIndex } from "@/components/sections/WorkIndex";
import { Hero } from "@/components/sections/Hero";
import { Footer } from "@/components/ui/Footer";

export default function Home() {
  return (
    <>
      <main id="main">
        <Hero />
        <About />
        <Experience />
        <Work />
        <WorkIndex />
        <Capabilities />
        <Recognition />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
