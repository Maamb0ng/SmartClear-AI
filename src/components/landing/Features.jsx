import { motion } from "framer-motion";

import {
  FaBell,
  FaChartLine,
  FaClipboardCheck,
  FaClock,
  FaRobot,
  FaUserShield,
} from "react-icons/fa";

const FEATURES = [
  {
    icon: FaRobot,
    title: "AI Student Assistant",
    description:
      "Provides guided answers about clearance steps, requirements, system navigation, and common student concerns.",
    accent: "from-violet-400/20 to-fuchsia-400/5",
    iconClass: "bg-violet-400/15 text-violet-300",
  },
  {
    icon: FaClipboardCheck,
    title: "Digital Clearance",
    description:
      "Moves requests, submissions, reviews, and approval records into one organized paperless workflow.",
    accent: "from-blue-400/20 to-cyan-400/5",
    iconClass: "bg-blue-400/15 text-cyan-300",
  },
  {
    icon: FaClock,
    title: "Real-Time Tracking",
    description:
      "Lets students monitor every office and subject clearance step through a clear progress view.",
    accent: "from-amber-400/20 to-orange-400/5",
    iconClass: "bg-amber-400/15 text-amber-300",
  },
  {
    icon: FaBell,
    title: "Smart Notifications",
    description:
      "Surfaces important updates when submissions are reviewed, approved, rejected, or require action.",
    accent: "from-rose-400/20 to-red-400/5",
    iconClass: "bg-rose-400/15 text-rose-300",
  },
  {
    icon: FaChartLine,
    title: "Reports & Monitoring",
    description:
      "Helps administrators review request activity, workflow performance, and audit records from one dashboard.",
    accent: "from-emerald-400/20 to-teal-400/5",
    iconClass: "bg-emerald-400/15 text-emerald-300",
  },
  {
    icon: FaUserShield,
    title: "Role-Based Access",
    description:
      "Keeps student, approver, and administrator tools separated according to verified roles and permissions.",
    accent: "from-sky-400/20 to-indigo-400/5",
    iconClass: "bg-sky-400/15 text-sky-300",
  },
];

function Features() {
  return (
    <section
      id="features"
      className="relative overflow-hidden bg-[#04143d] py-20 text-white sm:py-24"
    >
      <div className="pointer-events-none absolute -left-40 top-24 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-10 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex rounded-full border border-white/10 bg-white/[0.07] px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200">
            Core Platform Features
          </span>

          <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
            Everything needed for a
            <span className="block bg-gradient-to-r from-white to-cyan-300 bg-clip-text text-transparent">
              clearer clearance workflow.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-blue-100/70 sm:text-base">
            SmartClear AI brings requests, approvals, notifications, AI guidance,
            and administrative monitoring together in one secure platform.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  delay: index * 0.06,
                  duration: 0.48,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ y: -6 }}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#071b4b] p-5 shadow-[0_18px_44px_rgba(2,12,40,0.22)] sm:p-6"
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-70 transition group-hover:opacity-100`}
                />

                <div className="relative z-10">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${feature.iconClass}`}
                  >
                    <Icon className="text-xl" />
                  </div>

                  <h3 className="mt-5 text-lg font-black text-white">
                    {feature.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-blue-100/65">
                    {feature.description}
                  </p>

                  <div className="mt-5 h-px bg-gradient-to-r from-white/15 to-transparent" />

                  <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/55">
                    SmartClear AI
                  </p>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Features;
