import { motion } from "framer-motion";

import {
  FaChartLine,
  FaClock,
  FaLeaf,
  FaShieldAlt,
  FaUniversity,
  FaUsers,
} from "react-icons/fa";

const BENEFITS = [
  {
    icon: FaUniversity,
    title: "Built for School Workflows",
    description:
      "Supports student, faculty, office, registrar, and administrator responsibilities within one clearance process.",
  },
  {
    icon: FaClock,
    title: "Less Waiting",
    description:
      "Digital submissions and direct approver routing reduce unnecessary queues and repeated office visits.",
  },
  {
    icon: FaShieldAlt,
    title: "Controlled Access",
    description:
      "Verified roles and account activation help protect student information and administrative functions.",
  },
  {
    icon: FaLeaf,
    title: "Paperless Records",
    description:
      "Requests, requirements, remarks, decisions, and audit records remain organized inside the system.",
  },
  {
    icon: FaUsers,
    title: "Clearer Communication",
    description:
      "Students receive status updates and approver remarks without depending on informal follow-ups.",
  },
  {
    icon: FaChartLine,
    title: "Better Oversight",
    description:
      "Administrators can monitor clearance progress, reports, and recorded actions across departments.",
  },
];

const HIGHLIGHTS = [
  {
    value: "Paperless",
    label: "Digital request workflow",
  },
  {
    value: "Real-Time",
    label: "Progress and status updates",
  },
  {
    value: "Role-Based",
    label: "Student, approver, and admin access",
  },
  {
    value: "AI-Guided",
    label: "Student assistance and support",
  },
];

function Benefits() {
  return (
    <section
      id="benefits"
      className="relative overflow-hidden bg-[#061b51] py-20 text-white sm:py-24"
    >
      <div className="pointer-events-none absolute -left-40 bottom-0 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-0 h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl" />

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
            Why SmartClear AI
          </span>

          <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
            Designed to make clearance
            <span className="block bg-gradient-to-r from-white to-cyan-300 bg-clip-text text-transparent">
              simpler for everyone.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-blue-100/70 sm:text-base">
            The platform improves convenience for students while giving
            approvers and administrators a more organized way to manage work.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {BENEFITS.map((benefit, index) => {
            const Icon = benefit.icon;

            return (
              <motion.article
                key={benefit.title}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  delay: index * 0.055,
                  duration: 0.46,
                }}
                whileHover={{ y: -5 }}
                className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-md sm:p-6"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-300/12 text-cyan-300">
                  <Icon />
                </div>

                <h3 className="mt-5 text-lg font-black text-white">
                  {benefit.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-blue-100/65">
                  {benefit.description}
                </p>
              </motion.article>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.55 }}
          className="mt-12 grid overflow-hidden rounded-2xl border border-white/10 bg-[#071b4b] sm:grid-cols-2 xl:grid-cols-4"
        >
          {HIGHLIGHTS.map((highlight, index) => (
            <div
              key={highlight.value}
              className={`p-5 text-center sm:p-6 ${
                index !== HIGHLIGHTS.length - 1
                  ? "border-b border-white/10 xl:border-b-0 xl:border-r"
                  : ""
              }`}
            >
              <p className="text-xl font-black text-cyan-300">
                {highlight.value}
              </p>

              <p className="mt-1 text-xs text-blue-100/55">
                {highlight.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default Benefits;
