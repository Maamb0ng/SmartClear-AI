import { motion } from "framer-motion";

import {
  FaBullseye,
  FaCheckCircle,
  FaEye,
  FaRobot,
  FaUniversity,
} from "react-icons/fa";

import campusImage from "../../assets/cctc-campus.png";
import schoolLogo from "../../assets/cctc-logo.jpg";

const DETAILS = [
  {
    icon: FaUniversity,
    title: "Project Overview",
    description:
      "A centralized web platform that organizes clearance requests, office and subject approvals, notifications, reports, and enrollment verification.",
  },
  {
    icon: FaBullseye,
    title: "Mission",
    description:
      "To provide a secure and efficient clearance solution that reduces manual work and improves the student experience.",
  },
  {
    icon: FaEye,
    title: "Vision",
    description:
      "To support a more transparent, accessible, and digitally connected academic administration process.",
  },
];

function About() {
  return (
    <section
      id="about"
      className="relative overflow-hidden bg-[#eef3fb] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr] xl:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{
              duration: 0.65,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-[2rem] border border-white bg-[#061b51] shadow-[0_28px_70px_rgba(15,23,42,0.15)]">
              <img
                src={campusImage}
                alt="Consolatrix College campus"
                className="h-[420px] w-full object-cover sm:h-[500px]"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#03143f] via-[#061b51]/48 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 overflow-hidden rounded-full border border-white/25 bg-white p-0.5">
                    <img
                      src={schoolLogo}
                      alt="Consolatrix College seal"
                      className="h-full w-full rounded-full object-cover"
                    />
                  </div>

                  <div>
                    <p className="text-lg font-black text-white">
                      SmartClear AI
                    </p>

                    <p className="text-xs text-blue-100/65">
                      Consolatrix College of Toledo City, Inc.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur-md">
                  <FaRobot className="mt-0.5 shrink-0 text-xl text-cyan-300" />

                  <p className="text-sm leading-6 text-blue-50/85">
                    A smart digital clearance processing and workflow management
                    system with AI-based student assistance.
                  </p>
                </div>
              </div>
            </div>

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute -right-3 -top-3 hidden rounded-2xl border border-blue-100 bg-white p-4 text-blue-700 shadow-xl sm:block"
            >
              <FaCheckCircle className="text-2xl" />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{
              duration: 0.65,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <span className="inline-flex rounded-full border border-blue-200 bg-white px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 shadow-sm">
              About the Platform
            </span>

            <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Transforming the way
              <span className="block text-[#082a70]">
                school clearance is managed.
              </span>
            </h2>

            <p className="mt-5 text-sm leading-7 text-slate-600 sm:text-base">
              SmartClear AI replaces fragmented paper-based processing with an
              organized platform where every request, review, remark, and status
              update can be followed clearly.
            </p>

            <div className="mt-7 space-y-3">
              {DETAILS.map((detail, index) => {
                const Icon = detail.icon;

                return (
                  <motion.article
                    key={detail.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      delay: index * 0.07,
                      duration: 0.42,
                    }}
                    whileHover={{ x: 4 }}
                    className="flex gap-4 rounded-2xl border border-white bg-white/90 p-4 shadow-[0_12px_34px_rgba(15,23,42,0.06)] sm:p-5"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#071b4b] text-cyan-300">
                      <Icon />
                    </div>

                    <div>
                      <h3 className="font-black text-slate-900">
                        {detail.title}
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {detail.description}
                      </p>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default About;
