import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  FaArrowRight,
  FaBars,
  FaTimes,
} from "react-icons/fa";

import schoolLogo from "../../assets/cctc-logo.jpg";

const NAV_LINKS = [
  {
    name: "Home",
    href: "#home",
  },
  {
    name: "Features",
    href: "#features",
  },
  {
    name: "How It Works",
    href: "#how-it-works",
  },
  {
    name: "Benefits",
    href: "#benefits",
  },
  {
    name: "About",
    href: "#about",
  },
  {
    name: "FAQ",
    href: "#faq",
  },
  {
    name: "Contact",
    href: "#contact",
  },
];

function Navbar() {
  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    scrolled,
    setScrolled,
  ] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(
        window.scrollY > 18
      );
    };

    handleScroll();

    window.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true,
      }
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (
        window.innerWidth >= 1024
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, []);

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <motion.header
      initial={{
        y: -90,
        opacity: 0,
      }}
      animate={{
        y: 0,
        opacity: 1,
      }}
      transition={{
        duration: 0.65,
        ease: [
          0.22,
          1,
          0.36,
          1,
        ],
      }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/10 bg-[#061b51]/95 shadow-[0_14px_34px_rgba(2,12,40,0.28)] backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          onClick={closeMenu}
          className="group flex min-w-0 items-center gap-3"
        >
          <motion.div
            whileHover={{
              rotate: 4,
              scale: 1.04,
            }}
            className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/25 bg-white p-0.5 shadow-lg"
          >
            <img
              src={schoolLogo}
              alt="Consolatrix College of Toledo City seal"
              className="h-full w-full rounded-full object-cover"
            />
          </motion.div>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-black tracking-tight text-white sm:text-xl">
              SmartClear AI
            </h1>

            <p className="hidden truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-100/70 sm:block">
              Consolatrix College of Toledo City
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map(
            (link) => (
              <a
                key={link.name}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-100/80 transition hover:bg-white/10 hover:text-white"
              >
                {link.name}
              </a>
            )
          )}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            to="/login"
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
          >
            Sign In
          </Link>

          <motion.div
            whileHover={{
              y: -2,
            }}
            whileTap={{
              scale: 0.98,
            }}
          >
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-[#082a70] shadow-[0_10px_24px_rgba(255,255,255,0.16)] transition hover:bg-blue-50"
            >
              Create Account
              <FaArrowRight className="text-xs" />
            </Link>
          </motion.div>
        </div>

        <button
          type="button"
          onClick={() =>
            setIsOpen(
              (previousValue) =>
                !previousValue
            )
          }
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-xl text-white backdrop-blur transition hover:bg-white/15 lg:hidden"
          aria-label={
            isOpen
              ? "Close navigation menu"
              : "Open navigation menu"
          }
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <FaTimes />
          ) : (
            <FaBars />
          )}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{
              opacity: 0,
              y: -14,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -12,
            }}
            transition={{
              duration: 0.24,
            }}
            className="border-t border-white/10 bg-[#061b51]/98 px-4 pb-5 pt-3 shadow-2xl backdrop-blur-xl lg:hidden"
          >
            <nav className="mx-auto max-w-7xl">
              <div className="grid gap-1 sm:grid-cols-2">
                {NAV_LINKS.map(
                  (
                    link,
                    index
                  ) => (
                    <motion.a
                      key={
                        link.name
                      }
                      href={
                        link.href
                      }
                      onClick={
                        closeMenu
                      }
                      initial={{
                        opacity: 0,
                        x: -10,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      transition={{
                        delay:
                          index *
                          0.035,
                      }}
                      className="rounded-xl px-4 py-3 text-sm font-semibold text-blue-100/85 transition hover:bg-white/10 hover:text-white"
                    >
                      {
                        link.name
                      }
                    </motion.a>
                  )
                )}
              </div>

              <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
                <Link
                  to="/login"
                  onClick={
                    closeMenu
                  }
                  className="rounded-xl border border-white/15 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Sign In
                </Link>

                <Link
                  to="/register"
                  onClick={
                    closeMenu
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-[#082a70]"
                >
                  Create Account
                  <FaArrowRight className="text-xs" />
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

export default Navbar;