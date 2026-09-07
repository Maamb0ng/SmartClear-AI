import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Swal from "sweetalert2";

import {
  FaArrowLeft,
  FaCheckCircle,
  FaEnvelope,
  FaLock,
  FaPaperPlane,
  FaRobot,
  FaShieldAlt,
} from "react-icons/fa";

import Button from "../../components/common/Button";
import Input from "../../components/common/Input";

import { resetPassword } from "../../services/authService";

import campusImage from "../../assets/cctc-campus.png";
import schoolLogo from "../../assets/cctc-logo.jpg";

function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      await Swal.fire({
        icon: "warning",
        title: "Email Required",
        text: "Please enter your registered email address.",
        confirmButtonColor: "#2563eb",
      });

      return;
    }

    try {
      setLoading(true);

      await resetPassword(normalizedEmail);

      await Swal.fire({
        icon: "success",
        title: "Reset Link Sent",
        text: "A secure password reset link has been sent to your email.",
        confirmButtonColor: "#2563eb",
      });

      setEmail("");
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Reset Failed",
        text:
          error?.message ||
          "Unable to send the password reset link. Please try again.",
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_34%)]" />

      <div className="relative grid min-h-screen lg:grid-cols-[0.8fr_1.2fr]">
        {/* LEFT PANEL */}

        <motion.section
          initial={{ opacity: 0, x: -45 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.75,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="relative hidden min-h-screen overflow-hidden bg-[#061b51] text-white lg:block"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${campusImage})`,
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-b from-[#061b51]/92 via-[#082a70]/88 to-[#03143f]/96" />

          <motion.div
            animate={{
              x: [0, 28, 0],
              y: [0, -16, 0],
              scale: [1, 1.08, 1],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-300/15 blur-3xl"
          />

          <motion.div
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute -bottom-28 -right-28 h-72 w-72 rounded-full border border-white/10"
          />

          <div className="relative z-10 flex min-h-screen flex-col px-10 py-8 xl:px-14">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{
                  scale: 1.05,
                  rotate: 4,
                }}
                className="h-16 w-16 overflow-hidden rounded-full border border-white/30 bg-white p-1 shadow-xl"
              >
                <img
                  src={schoolLogo}
                  alt="Consolatrix College of Toledo City seal"
                  className="h-full w-full rounded-full object-cover"
                />
              </motion.div>

              <div>
                <h1 className="text-2xl font-black tracking-tight">
                  SmartClear AI
                </h1>

                <p className="mt-0.5 text-xs text-blue-100/80">
                  Password Recovery
                </p>
              </div>
            </div>

            <div className="my-auto max-w-lg">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16, duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100 backdrop-blur-md"
              >
                <FaShieldAlt className="text-cyan-300" />
                Secure recovery
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24, duration: 0.6 }}
                className="mt-5 text-4xl font-black leading-tight xl:text-5xl"
              >
                Recover access to your
                <span className="block bg-gradient-to-r from-white to-cyan-300 bg-clip-text text-transparent">
                  SmartClear account.
                </span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, duration: 0.55 }}
                className="mt-5 text-sm leading-7 text-blue-100/80 xl:text-base"
              >
                Enter your registered email address and we will send a secure
                password reset link.
              </motion.p>

              <div className="mt-8 space-y-3">
                {[
                  "Secure email verification",
                  "Time-limited reset link",
                  "Protected account recovery",
                ].map((item, index) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: -18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: 0.4 + index * 0.08,
                      duration: 0.45,
                    }}
                    whileHover={{ x: 5 }}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.07] px-3.5 py-3 backdrop-blur-md"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-300/15 text-cyan-300">
                      <FaCheckCircle className="text-xs" />
                    </div>

                    <span className="text-sm font-semibold text-white/90">
                      {item}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="border-t border-white/10 pt-5">
              <p className="text-xs font-semibold text-white">
                Consolatrix College of Toledo City, Inc.
              </p>

              <p className="mt-1 text-[11px] text-blue-100/65">
                Smarter • Faster • Paperless
              </p>
            </div>
          </div>
        </motion.section>

        {/* RIGHT PANEL */}

        <section className="relative flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 lg:px-10 xl:px-14">
          <motion.div
            initial={{
              opacity: 0,
              y: 22,
              scale: 0.98,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            transition={{
              duration: 0.65,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="w-full max-w-lg"
          >
            <div className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/95 shadow-[0_28px_70px_rgba(15,23,42,0.16)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-7">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 overflow-hidden rounded-full border border-slate-200 bg-white p-0.5 shadow lg:hidden">
                    <img
                      src={schoolLogo}
                      alt="Consolatrix College of Toledo City seal"
                      className="h-full w-full rounded-full object-cover"
                    />
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      Reset Password
                    </h2>

                    <p className="text-xs text-slate-500">
                      Secure account recovery
                    </p>
                  </div>
                </div>

                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  <FaArrowLeft />
                  <span className="hidden sm:inline">Login</span>
                </Link>
              </div>

              <div className="px-5 py-7 sm:px-7 sm:py-8">
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14, duration: 0.5 }}
                  className="text-center"
                >
                  <motion.div
                    animate={{
                      y: [0, -5, 0],
                      rotate: [0, -2, 2, 0],
                    }}
                    transition={{
                      duration: 3.4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-100 shadow-[0_14px_35px_rgba(37,99,235,0.18)]"
                  >
                    <FaEnvelope className="text-3xl text-blue-700" />
                  </motion.div>

                  <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-900">
                    Forgot your password?
                  </h1>

                  <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
                    Enter your registered email and we will send you a reset link.
                  </p>
                </motion.div>

                <form
                  onSubmit={handleSubmit}
                  className="mt-7 space-y-5"
                >
                  <motion.div
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.24, duration: 0.5 }}
                  >
                    <Input
                      label="Email Address"
                      name="email"
                      type="email"
                      placeholder="Enter your registered email"
                      value={email}
                      onChange={(event) =>
                        setEmail(event.target.value)
                      }
                      leftIcon={<FaEnvelope />}
                      required
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.34, duration: 0.5 }}
                  >
                    <Button
                      type="submit"
                      size="lg"
                      disabled={loading}
                      className="group w-full !rounded-xl !bg-gradient-to-r !from-blue-700 !via-blue-600 !to-indigo-600 shadow-[0_12px_26px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(37,99,235,0.34)]"
                    >
                      <span className="flex items-center justify-center gap-2.5">
                        {loading
                          ? "Sending Reset Link..."
                          : "Send Reset Link"}

                        {!loading && (
                          <FaPaperPlane className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-0.5" />
                        )}
                      </span>
                    </Button>
                  </motion.div>
                </form>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.44, duration: 0.5 }}
                  className="mt-6 rounded-xl border border-blue-100 bg-blue-50/70 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                      <FaLock />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Check your inbox
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        The reset link may take a few moments to arrive. Check your
                        spam folder if you do not see it.
                      </p>
                    </div>
                  </div>
                </motion.div>

                <div className="mt-7 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 transition hover:text-blue-800"
                  >
                    <FaArrowLeft />
                    Back to Login
                  </Link>
                </div>
              </div>
            </div>

            <p className="mt-4 text-center text-[11px] text-slate-400">
              © {new Date().getFullYear()} SmartClear AI
            </p>
          </motion.div>
        </section>
      </div>
    </main>
  );
}

export default ForgotPassword;