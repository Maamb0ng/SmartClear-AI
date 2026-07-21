import { motion } from "framer-motion";

import {
  FaCheckCircle,
  FaClipboardCheck,
  FaFileUpload,
  FaIdCard,
  FaSearch,
  FaUserCheck,
} from "react-icons/fa";

const STEPS = [
  {
    icon: FaIdCard,
    title: "Create an Account",
    description:
      "Register as a student or approver using official identification and contact information.",
  },
  {
    icon: FaUserCheck,
    title: "Administrator Verification",
    description:
      "The administrator checks account details, assigns the official student section, and activates access.",
  },
  {
    icon: FaClipboardCheck,
    title: "Request Clearance",
    description:
      "The student submits a clearance request for the selected semester and school year.",
  },
  {
    icon: FaFileUpload,
    title: "Submit Requirements",
    description:
      "Students send messages or files directly to their assigned subject and office approvers.",
  },
  {
    icon: FaSearch,
    title: "Approver Review",
    description:
      "Faculty and office approvers review submissions, provide remarks, and approve or reject each step.",
  },
  {
    icon: FaCheckCircle,
    title: "Complete & Verify",
    description:
      "After all steps are approved, the system issues a digital clearance pass for enrollment verification.",
  },
];

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden bg-[#eef3fb] py-20 sm:py-24"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/70 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
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
          <span className="inline-flex rounded-full border border-blue-200 bg-white px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 shadow-sm">
            Clearance Workflow
          </span>

          <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            From registration to
            <span className="block text-[#082a70]">
              verified digital clearance.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Each user follows a clear and traceable process, reducing uncertainty
            while keeping every action recorded.
          </p>
        </motion.div>

        <div className="relative mt-12">
          <div className="absolute left-1/2 top-12 hidden h-px w-[82%] -translate-x-1/2 bg-gradient-to-r from-transparent via-blue-300 to-transparent xl:block" />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {STEPS.map((step, index) => {
              const Icon = step.icon;

              return (
                <motion.article
                  key={step.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{
                    delay: index * 0.06,
                    duration: 0.48,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={{ y: -5 }}
                  className="relative rounded-2xl border border-white bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#071b4b] text-cyan-300 shadow-lg">
                      <Icon className="text-lg" />
                    </div>

                    <span className="text-4xl font-black text-slate-100">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg font-black text-slate-900">
                    {step.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {step.description}
                  </p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
