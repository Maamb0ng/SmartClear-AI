import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
} from "framer-motion";

import Navbar from "./components/layout/Navbar";
import Hero from "./components/landing/Hero";
import Features from "./components/landing/Features";
import HowItWorks from "./components/landing/HowItWorks";
import Benefits from "./components/landing/Benefits";
import About from "./components/landing/About";
import FAQ from "./components/landing/FAQ";
import Contact from "./components/landing/Contact";
import Developers from "./components/landing/Developers";
import Footer from "./components/landing/Footer";

function RevealSection({
  children,
  delay = 0,
}) {
  const reduceMotion =
    useReducedMotion();

  return (
    <motion.div
      initial={
        reduceMotion
          ? false
          : {
              opacity: 0,
              y: 34,
            }
      }
      whileInView={
        reduceMotion
          ? undefined
          : {
              opacity: 1,
              y: 0,
            }
      }
      viewport={{
        once: true,
        amount: 0.12,
      }}
      transition={{
        duration: 0.65,
        delay,
        ease: [
          0.22,
          1,
          0.36,
          1,
        ],
      }}
    >
      {children}
    </motion.div>
  );
}

function Landing() {
  const reduceMotion =
    useReducedMotion();

  const {
    scrollYProgress,
  } = useScroll();

  const progressScale =
    useSpring(
      scrollYProgress,
      {
        stiffness: 120,
        damping: 24,
        restDelta: 0.001,
      }
    );

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#03143f] selection:bg-cyan-300 selection:text-[#03143f]">
      {/* Page scroll progress */}

      <motion.div
        aria-hidden="true"
        style={{
          scaleX:
            reduceMotion
              ? scrollYProgress
              : progressScale,
        }}
        className="fixed inset-x-0 top-0 z-[70] h-1 origin-left bg-gradient-to-r from-blue-500 via-cyan-300 to-blue-500 shadow-[0_0_18px_rgba(34,211,238,0.55)]"
      />

      {/* Ambient background accents */}

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          animate={
            reduceMotion
              ? undefined
              : {
                  x: [
                    0,
                    40,
                    0,
                  ],
                  y: [
                    0,
                    -24,
                    0,
                  ],
                }
          }
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -left-32 top-24 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl"
        />

        <motion.div
          animate={
            reduceMotion
              ? undefined
              : {
                  x: [
                    0,
                    -34,
                    0,
                  ],
                  y: [
                    0,
                    28,
                    0,
                  ],
                }
          }
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -right-40 top-[38rem] h-[28rem] w-[28rem] rounded-full bg-cyan-400/10 blur-3xl"
        />
      </div>

      <Navbar />

      <motion.main
        initial={
          reduceMotion
            ? false
            : {
                opacity: 0,
              }
        }
        animate={{
          opacity: 1,
        }}
        transition={{
          duration: 0.55,
          ease: [
            0.22,
            1,
            0.36,
            1,
          ],
        }}
      >
        {/* Hero keeps its own full entrance animation */}

        <Hero />

        {/* Existing landing sections preserved */}

        <RevealSection>
          <Features />
        </RevealSection>

        <RevealSection>
          <HowItWorks />
        </RevealSection>

        <RevealSection>
          <Benefits />
        </RevealSection>

        <RevealSection>
          <About />
        </RevealSection>

        <RevealSection>
          <FAQ />
        </RevealSection>

        <RevealSection>
          <Contact />
        </RevealSection>

        {/* Development team section */}

        <RevealSection>
          <Developers />
        </RevealSection>

        <RevealSection>
          <Footer />
        </RevealSection>
      </motion.main>
    </div>
  );
}

export default Landing;