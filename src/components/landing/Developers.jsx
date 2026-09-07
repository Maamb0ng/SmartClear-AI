import { motion } from "framer-motion";

import {
  FaCheckCircle,
  FaCode,
  FaLaptopCode,
  FaPalette,
  FaRobot,
  FaUserCheck,
  FaVial,
} from "react-icons/fa";

const TEAM_MEMBERS = [
  {
    name: "Philip Joshua Maambong",
    role: "Lead Developer",
    initials: "PM",
    icon: FaCode,
    description:
      "Leads the overall system development, architecture, implementation, and integration of SmartClear AI.",
    featured: true,
  },
  {
    name: "Kisha Althea Sermon",
    role: "Assistant Programmer",
    initials: "KS",
    icon: FaLaptopCode,
    description:
      "Supports the development, testing, maintenance, and implementation of core system features.",
  },
  {
    name: "Crislyn Surig",
    role: "UI/UX Designer",
    initials: "CS",
    icon: FaPalette,
    description:
      "Designs the platform interface and improves usability, accessibility, and visual consistency.",
  },
  {
    name: "Alfred Barreda",
    role: "QA / Tester",
    initials: "AB",
    icon: FaVial,
    description:
      "Tests system features, identifies issues, and helps verify the quality and reliability of the platform.",
  },
  {
    name: "Gil Cabalida",
    role: "QA / Tester",
    initials: "GC",
    icon: FaUserCheck,
    description:
      "Performs functional testing and validates workflows to support a stable user experience.",
  },
];

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 24,
  },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: index * 0.08,
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

function Developers() {
  const leadDeveloper = TEAM_MEMBERS.find(
    (member) => member.featured
  );

  const supportingMembers = TEAM_MEMBERS.filter(
    (member) => !member.featured
  );

  const LeadIcon = leadDeveloper.icon;

  return (
    <section
      id="developers"
      className="relative overflow-hidden bg-[#eef3fb] py-20 sm:py-24"
    >
      <div className="pointer-events-none absolute -left-40 top-16 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{
            opacity: 0,
            y: 24,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
            amount: 0.35,
          }}
          transition={{
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 shadow-sm">
            <FaRobot />
            Development Team
          </span>

          <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Meet the team behind
            <span className="block text-[#082a70]">
              SmartClear AI.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            SmartClear AI was designed and developed by a collaborative team
            focused on programming, interface design, testing, and system
            quality.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-5 xl:grid-cols-[0.95fr_1.45fr]">
          {/* Lead Developer */}

          <motion.article
            custom={0}
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{
              once: true,
              amount: 0.2,
            }}
            whileHover={{
              y: -6,
            }}
            className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#061b51] via-[#082a70] to-[#0b4f92] p-6 text-white shadow-[0_24px_60px_rgba(2,12,40,0.22)] sm:p-8"
          >
            <motion.div
              animate={{
                x: [0, 22, 0],
                y: [0, -14, 0],
              }}
              transition={{
                duration: 9,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl"
            />

            <div className="relative z-10">
              <div className="flex items-start justify-between gap-4">
                <motion.div
                  whileHover={{
                    rotate: 3,
                    scale: 1.04,
                  }}
                  className="flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-white/15 bg-white/10 text-3xl font-black text-cyan-300 shadow-xl backdrop-blur"
                >
                  {leadDeveloper.initials}
                </motion.div>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-300/15 text-xl text-cyan-300">
                  <LeadIcon />
                </div>
              </div>

              <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200/75">
                Project Leadership
              </p>

              <h3 className="mt-2 text-2xl font-black sm:text-3xl">
                {leadDeveloper.name}
              </h3>

              <p className="mt-2 text-sm font-bold text-cyan-300">
                {leadDeveloper.role}
              </p>

              <p className="mt-5 text-sm leading-7 text-blue-100/75">
                {leadDeveloper.description}
              </p>

              <div className="mt-6 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-4">
                <FaCheckCircle className="shrink-0 text-emerald-300" />

                <p className="text-xs leading-5 text-blue-100/75">
                  Responsible for coordinating the technical direction and
                  development of the complete SmartClear AI platform.
                </p>
              </div>
            </div>
          </motion.article>

          {/* Supporting Team */}

          <div className="grid gap-5 sm:grid-cols-2">
            {supportingMembers.map((member, index) => {
              const Icon = member.icon;

              return (
                <motion.article
                  key={member.name}
                  custom={index + 1}
                  variants={cardVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{
                    once: true,
                    amount: 0.2,
                  }}
                  whileHover={{
                    y: -6,
                  }}
                  className="group relative overflow-hidden rounded-2xl border border-white bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6"
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/80 to-cyan-50/20 opacity-0 transition duration-300 group-hover:opacity-100" />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#071b4b] text-xl font-black text-cyan-300 shadow-lg">
                        {member.initials}
                      </div>

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                        <Icon />
                      </div>
                    </div>

                    <h3 className="mt-5 text-lg font-black text-slate-900">
                      {member.name}
                    </h3>

                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-blue-700">
                      {member.role}
                    </p>

                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      {member.description}
                    </p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>

        <motion.div
          initial={{
            opacity: 0,
            y: 18,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
          }}
          transition={{
            delay: 0.2,
            duration: 0.5,
          }}
          className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-white/80 px-5 py-5 text-center shadow-sm backdrop-blur sm:flex-row sm:text-left"
        >
          <div>
            <p className="font-black text-slate-900">
              BSIT Capstone Development Team
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Consolatrix College of Toledo City, Inc.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-xs font-bold text-blue-700">
            <FaCheckCircle />
            Built through teamwork
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default Developers;