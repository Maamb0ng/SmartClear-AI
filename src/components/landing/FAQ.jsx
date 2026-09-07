import { useState } from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  FaChevronDown,
  FaQuestionCircle,
} from "react-icons/fa";

const FAQS = [
  {
    question: "What is SmartClear AI?",
    answer:
      "SmartClear AI is a web-based digital clearance processing and workflow management system with AI-based student assistance.",
  },
  {
    question: "Who can use the platform?",
    answer:
      "The platform supports students, faculty and office approvers, administrators, and registrar verification according to assigned roles.",
  },
  {
    question: "Can students track every clearance step?",
    answer:
      "Yes. Students can view office and subject clearance steps, current status, approver remarks, submissions, and progress updates.",
  },
  {
    question: "What happens when a requirement is rejected?",
    answer:
      "The approver provides remarks, the step is returned to the student, and the student can submit a corrected message or file for another review.",
  },
  {
    question: "When is the digital clearance pass created?",
    answer:
      "The pass becomes available after all required office and subject steps are approved and the clearance request is completed.",
  },
  {
    question: "How does the AI assistant help?",
    answer:
      "It guides students through system navigation, clearance procedures, common requirements, and questions related to their workflow.",
  },
];

function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  const toggleFAQ = (index) => {
    setOpenIndex((previousIndex) =>
      previousIndex === index
        ? null
        : index
    );
  };

  return (
    <section
      id="faq"
      className="relative overflow-hidden bg-[#04143d] py-20 text-white sm:py-24"
    >
      <div className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200">
            <FaQuestionCircle />
            Frequently Asked Questions
          </span>

          <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
            Common questions,
            <span className="block bg-gradient-to-r from-white to-cyan-300 bg-clip-text text-transparent">
              clearly answered.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-blue-100/65 sm:text-base">
            Learn how account verification, requests, reviews, resubmissions,
            progress tracking, and completion work.
          </p>
        </motion.div>

        <div className="mx-auto mt-12 max-w-4xl space-y-3">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <motion.article
                key={faq.question}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                  delay: index * 0.045,
                  duration: 0.42,
                }}
                className={`overflow-hidden rounded-2xl border transition ${
                  isOpen
                    ? "border-cyan-300/25 bg-[#071b4b]"
                    : "border-white/10 bg-white/[0.05]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFAQ(index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-black text-white sm:text-base">
                    {faq.question}
                  </span>

                  <motion.span
                    animate={{
                      rotate: isOpen ? 180 : 0,
                    }}
                    transition={{ duration: 0.22 }}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      isOpen
                        ? "bg-cyan-300/15 text-cyan-300"
                        : "bg-white/[0.07] text-blue-100/70"
                    }`}
                  >
                    <FaChevronDown className="text-xs" />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{
                        height: 0,
                        opacity: 0,
                      }}
                      animate={{
                        height: "auto",
                        opacity: 1,
                      }}
                      exit={{
                        height: 0,
                        opacity: 0,
                      }}
                      transition={{
                        duration: 0.28,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <div className="border-t border-white/10 px-5 pb-5 pt-4 text-sm leading-7 text-blue-100/70 sm:px-6">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FAQ;
