import { motion } from "framer-motion";

import {
  FaEnvelope,
  FaMapMarkerAlt,
  FaPaperPlane,
  FaShieldAlt,
  FaUniversity,
} from "react-icons/fa";

import schoolLogo from "../../assets/cctc-logo.jpg";

const CONTACT_ITEMS = [
  {
    icon: FaUniversity,
    title: "School Administration",
    description:
      "For account verification, clearance policies, and official student record concerns.",
  },
  {
    icon: FaEnvelope,
    title: "System Support",
    description:
      "For login, password recovery, navigation, and technical platform concerns.",
  },
  {
    icon: FaMapMarkerAlt,
    title: "Campus Assistance",
    description:
      "Visit the appropriate school office when an official in-person transaction is required.",
  },
];

function Contact() {
  return (
    <section
      id="contact"
      className="relative overflow-hidden bg-[#eef3fb] py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] xl:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{
              duration: 0.62,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <span className="inline-flex rounded-full border border-blue-200 bg-white px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 shadow-sm">
              Contact & Support
            </span>

            <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Need help with
              <span className="block text-[#082a70]">
                SmartClear AI?
              </span>
            </h2>

            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              Use the appropriate school support channel depending on whether
              your concern involves an account, clearance requirement, or
              technical system issue.
            </p>

            <div className="mt-7 space-y-3">
              {CONTACT_ITEMS.map((item, index) => {
                const Icon = item.icon;

                return (
                  <motion.article
                    key={item.title}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      delay: index * 0.07,
                      duration: 0.4,
                    }}
                    whileHover={{ x: 4 }}
                    className="flex gap-4 rounded-2xl border border-white bg-white/90 p-4 shadow-[0_12px_34px_rgba(15,23,42,0.06)]"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#071b4b] text-cyan-300">
                      <Icon />
                    </div>

                    <div>
                      <h3 className="font-black text-slate-900">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {item.description}
                      </p>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{
              duration: 0.62,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_28px_70px_rgba(15,23,42,0.12)]"
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-[#061b51] px-5 py-5 text-white sm:px-7">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-full border border-white/20 bg-white p-0.5">
                  <img
                    src={schoolLogo}
                    alt="Consolatrix College seal"
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>

                <div>
                  <h3 className="font-black">
                    Send an Inquiry
                  </h3>

                  <p className="text-xs text-blue-100/60">
                    SmartClear AI support form
                  </p>
                </div>
              </div>

              <FaShieldAlt className="text-cyan-300" />
            </div>

            <form
              onSubmit={(event) => event.preventDefault()}
              className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7"
            >
              <div>
                <label
                  htmlFor="contact-name"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-slate-600"
                >
                  Full Name
                </label>

                <input
                  id="contact-name"
                  type="text"
                  placeholder="Enter your full name"
                  className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="contact-email"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-slate-600"
                >
                  Email Address
                </label>

                <input
                  id="contact-email"
                  type="email"
                  placeholder="Enter your email"
                  className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="contact-subject"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-slate-600"
                >
                  Subject
                </label>

                <input
                  id="contact-subject"
                  type="text"
                  placeholder="What is your concern?"
                  className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="contact-message"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-slate-600"
                >
                  Message
                </label>

                <textarea
                  id="contact-message"
                  rows="5"
                  placeholder="Describe your concern"
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="sm:col-span-2">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 px-5 text-sm font-black text-white shadow-[0_12px_26px_rgba(37,99,235,0.25)]"
                >
                  <FaPaperPlane />
                  Send Message
                </motion.button>

                <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">
                  Connect this form to the school&apos;s official support email
                  service before production deployment.
                </p>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default Contact;
