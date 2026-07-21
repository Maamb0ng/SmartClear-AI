import { Link } from "react-router-dom";

import { motion } from "framer-motion";

import {
  FaArrowRight,
  FaCheckCircle,
  FaRobot,
  FaShieldAlt,
} from "react-icons/fa";

import schoolLogo from "../../assets/cctc-logo.jpg";

const QUICK_LINKS = [
  {
    label: "Home",
    href: "#home",
  },
  {
    label: "Features",
    href: "#features",
  },
  {
    label: "How It Works",
    href: "#how-it-works",
  },
  {
    label: "Benefits",
    href: "#benefits",
  },
  {
    label: "About",
    href: "#about",
  },
  {
    label: "FAQ",
    href: "#faq",
  },
];

const SYSTEM_ITEMS = [
  "Digital clearance requests",
  "Office and faculty approvals",
  "Real-time notifications",
  "AI student assistance",
  "Reports and audit records",
];

function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#020d2b] text-white">
      <div className="pointer-events-none absolute -left-32 top-0 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_0.65fr_0.85fr_0.9fr]">
          <div>
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{
                  rotate: 4,
                  scale: 1.04,
                }}
                className="h-14 w-14 overflow-hidden rounded-full border border-white/20 bg-white p-0.5 shadow-xl"
              >
                <img
                  src={schoolLogo}
                  alt="Consolatrix College seal"
                  className="h-full w-full rounded-full object-cover"
                />
              </motion.div>

              <div>
                <h2 className="text-xl font-black">
                  SmartClear AI
                </h2>

                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/65">
                  Digital Clearance System
                </p>
              </div>
            </div>

            <p className="mt-5 max-w-md text-sm leading-7 text-blue-100/55">
              A web-based smart digital clearance processing and workflow
              management system with AI-based student assistance.
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-xs text-blue-100/70">
              <FaShieldAlt className="text-cyan-300" />
              Secure role-based platform
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-white">
              Quick Links
            </h3>

            <ul className="mt-5 space-y-3">
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-blue-100/55 transition hover:text-cyan-300"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-white">
              Platform
            </h3>

            <ul className="mt-5 space-y-3">
              {SYSTEM_ITEMS.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-blue-100/55"
                >
                  <FaCheckCircle className="mt-1 shrink-0 text-[10px] text-cyan-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-white">
              Get Started
            </h3>

            <p className="mt-5 text-sm leading-6 text-blue-100/55">
              Register an account or sign in to access the correct SmartClear
              portal for your role.
            </p>

            <div className="mt-5 space-y-3">
              <Link
                to="/register"
                className="group flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-[#082a70] transition hover:bg-blue-50"
              >
                Create Account
                <FaArrowRight className="text-xs transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                to="/login"
                className="flex h-11 items-center justify-center rounded-xl border border-white/15 bg-white/[0.05] px-4 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-center text-[11px] text-blue-100/40 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>
            © {new Date().getFullYear()} SmartClear AI. All rights reserved.
          </p>

          <p>
            BSIT Capstone Project • Consolatrix College of Toledo City, Inc.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
