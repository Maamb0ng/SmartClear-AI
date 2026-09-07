import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Swal from "sweetalert2";

import {
  FaArrowRight,
  FaBell,
  FaCheckCircle,
  FaEye,
  FaEyeSlash,
  FaGraduationCap,
  FaIdBadge,
  FaLock,
  FaPaperPlane,
  FaRobot,
  FaShieldAlt,
  FaUserGraduate,
  FaUserShield,
  FaUsersCog,
} from "react-icons/fa";

import Button from "../../components/common/Button";
import Input from "../../components/common/Input";

import { loginUser } from "../../services/authService";

import campusImage from "../../assets/cctc-campus.png";
import schoolLogo from "../../assets/cctc-logo.jpg";

const FEATURES = [
  {
    icon: FaBell,
    title: "Real-time Tracking",
    description: "Monitor clearance progress and updates instantly.",
    accent: "from-blue-400 to-cyan-300",
  },
  {
    icon: FaRobot,
    title: "AI Student Assistant",
    description: "Get guidance and answers throughout the process.",
    accent: "from-violet-400 to-fuchsia-300",
  },
  {
    icon: FaShieldAlt,
    title: "Secure & Reliable",
    description: "Protected role-based access for every user.",
    accent: "from-emerald-400 to-teal-300",
  },
  {
    icon: FaPaperPlane,
    title: "Paperless Workflow",
    description: "Faster, cleaner, and more efficient clearance.",
    accent: "from-orange-400 to-amber-300",
  },
];

const USER_ROLES = [
  {
    icon: FaUserGraduate,
    title: "Students",
    description: "Track & manage clearance",
  },
  {
    icon: FaIdBadge,
    title: "Approvers",
    description: "Review & approve requests",
  },
  {
    icon: FaUsersCog,
    title: "Administrators",
    description: "Manage system & users",
  },
];

const panelVariants = {
  hidden: { opacity: 0, x: -50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.75,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

function Login() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
    remember: false,
  });

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.identifier.trim() || !formData.password) {
      await Swal.fire({
        icon: "warning",
        title: "Missing Information",
        text: "Please enter your Student ID, Employee ID, or Email and Password.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    try {
      setLoading(true);

      const profile = await loginUser(
        formData.identifier.trim(),
        formData.password
      );

      await Swal.fire({
        icon: "success",
        title: "Welcome Back!",
        text: `Logged in as ${profile.role}`,
        timer: 1300,
        showConfirmButton: false,
      });

      if (profile.role === "Student") {
        navigate("/student/dashboard", { replace: true });
      } else if (profile.role === "Approver") {
        navigate("/approver/dashboard", { replace: true });
      } else if (profile.role === "Administrator") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Login Failed",
        text:
          error?.message ||
          "Unable to sign in. Please verify your credentials and try again.",
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_34%)]" />

      <div className="relative grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
        {/* LEFT BRANDING PANEL */}
        <motion.section
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          className="relative hidden min-h-screen overflow-hidden bg-[#061b51] text-white lg:flex lg:flex-col"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${campusImage})` }}
          />

          <div className="absolute inset-0 bg-gradient-to-b from-[#061b51]/90 via-[#082a70]/88 to-[#03143f]/96" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(59,130,246,0.08),transparent_45%)]" />

          <motion.div
            animate={{ x: [0, 35, 0], y: [0, -18, 0] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl"
          />

          <motion.div
            animate={{ x: [0, -28, 0], y: [0, 22, 0] }}
            transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-28 right-8 h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl"
          />

          <div className="relative z-10 flex min-h-screen flex-col px-10 py-8 xl:px-14 xl:py-10">
            <motion.div variants={itemVariants} className="flex items-center gap-4">
              <motion.div
                whileHover={{ rotate: 4, scale: 1.04 }}
                className="relative h-20 w-20 overflow-hidden rounded-full border border-white/30 bg-white p-1 shadow-[0_12px_35px_rgba(0,0,0,0.28)]"
              >
                <img
                  src={schoolLogo}
                  alt="Consolatrix College of Toledo City seal"
                  className="h-full w-full rounded-full object-cover"
                />
              </motion.div>

              <div>
                <h1 className="text-2xl font-black tracking-tight xl:text-3xl">
                  SmartClear AI
                </h1>
                <p className="mt-1 text-sm font-medium text-blue-100/90">
                  Digital Clearance Processing System
                </p>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-10 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100 backdrop-blur-md">
                <FaCheckCircle className="text-cyan-300" />
                Smart campus workflow
              </div>

              <h2 className="mt-6 text-4xl font-black leading-[1.08] tracking-tight xl:text-5xl">
                Welcome back to your
                <span className="block bg-gradient-to-r from-white via-blue-100 to-cyan-300 bg-clip-text text-transparent">
                  digital clearance portal.
                </span>
              </h2>

              <p className="mt-5 max-w-lg text-sm leading-7 text-blue-100/85 xl:text-base">
                Track progress, receive notifications, communicate with assigned
                approvers, and complete your clearance through one secure system.
              </p>
            </motion.div>

            <div className="mt-8 grid gap-3 xl:grid-cols-2">
              {FEATURES.map((feature, index) => {
                const Icon = feature.icon;

                return (
                  <motion.div
                    key={feature.title}
                    variants={itemVariants}
                    whileHover={{ y: -4, scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 250, damping: 20 }}
                    className="group rounded-2xl border border-white/10 bg-white/[0.08] p-4 shadow-[0_14px_30px_rgba(2,12,40,0.22)] backdrop-blur-md"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${feature.accent} text-[#061b51] shadow-lg`}
                      >
                        <Icon className="text-lg" />
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-white">
                          {feature.title}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-blue-100/75">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              variants={itemVariants}
              className="mt-auto flex items-center gap-3 border-t border-white/10 pt-6 text-sm text-blue-100/80"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-cyan-300">
                <FaGraduationCap />
              </div>
              <div>
                <p className="font-semibold text-white">
                  Consolatrix College of Toledo City, Inc.
                </p>
                <p className="text-xs">
                  Smarter • Faster • Paperless
                </p>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* RIGHT LOGIN PANEL */}
        <section className="relative flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:px-12 xl:px-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-xl"
          >
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-blue-400/10 blur-3xl" />

            <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/95 shadow-[0_30px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl">
              <div className="border-b border-slate-100 px-6 py-6 sm:px-9">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 lg:hidden">
                    <div className="h-12 w-12 overflow-hidden rounded-full border border-slate-200 bg-white p-0.5 shadow">
                      <img
                        src={schoolLogo}
                        alt="Consolatrix College of Toledo City seal"
                        className="h-full w-full rounded-full object-cover"
                      />
                    </div>

                    <div>
                      <p className="font-black text-slate-900">SmartClear AI</p>
                      <p className="text-xs text-slate-500">
                        Digital Clearance System
                      </p>
                    </div>
                  </div>

                  <div className="ml-auto inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    <FaUserShield />
                    Secure Login
                  </div>
                </div>
              </div>

              <div className="px-6 py-8 sm:px-9 sm:py-10">
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.5 }}
                  className="text-center"
                >
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-100 shadow-[0_14px_35px_rgba(37,99,235,0.18)]"
                  >
                    <FaRobot className="text-4xl text-blue-700" />
                  </motion.div>

                  <h2 className="mt-6 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                    Sign in to SmartClear
                  </h2>

                  <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
                    Use your Student ID, Employee ID, or registered email address.
                  </p>
                </motion.div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <motion.div
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.28, duration: 0.5 }}
                  >
                    <Input
                      label="Student ID / Employee ID / Email"
                      name="identifier"
                      type="text"
                      placeholder="Enter your ID or email"
                      value={formData.identifier}
                      onChange={handleChange}
                      leftIcon={<FaUserGraduate />}
                      required
                    />
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Students may use their student number. Approvers and
                      administrators may use an employee ID or email.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.36, duration: 0.5 }}
                  >
                    <Input
                      label="Password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      leftIcon={<FaLock />}
                      rightIcon={showPassword ? <FaEyeSlash /> : <FaEye />}
                      onRightIconClick={() =>
                        setShowPassword((previousValue) => !previousValue)
                      }
                      required
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.44, duration: 0.5 }}
                    className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <label className="inline-flex cursor-pointer items-center gap-2.5 text-slate-600">
                      <input
                        type="checkbox"
                        name="remember"
                        checked={formData.remember}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                      />
                      Remember me
                    </label>

                    <Link
                      to="/forgot-password"
                      className="font-semibold text-blue-700 transition hover:text-blue-800"
                    >
                      Forgot password?
                    </Link>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.52, duration: 0.5 }}
                  >
                    <Button
                      type="submit"
                      size="lg"
                      disabled={loading}
                      className="group w-full !rounded-xl !bg-gradient-to-r !from-blue-700 !via-blue-600 !to-indigo-600 shadow-[0_14px_30px_rgba(37,99,235,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(37,99,235,0.36)]"
                    >
                      <span className="flex items-center justify-center gap-2.5">
                        {loading ? "Signing In..." : "Sign In"}
                        {!loading && (
                          <FaArrowRight className="transition-transform group-hover:translate-x-1" />
                        )}
                      </span>
                    </Button>
                  </motion.div>
                </form>

                <div className="my-7 flex items-center gap-4">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    New here?
                  </span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <Link
                  to="/register"
                  className="group flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3.5 text-sm font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                >
                  Create an account
                  <FaArrowRight className="transition-transform group-hover:translate-x-1" />
                </Link>

                <div className="mt-8 grid grid-cols-3 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-slate-50/70 px-2 py-4">
                  {USER_ROLES.map((role) => {
                    const Icon = role.icon;

                    return (
                      <div key={role.title} className="px-2 text-center">
                        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
                          <Icon className="text-sm" />
                        </div>
                        <p className="mt-2 text-xs font-bold text-slate-700">
                          {role.title}
                        </p>
                        <p className="mt-1 hidden text-[10px] leading-4 text-slate-500 sm:block">
                          {role.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <p className="mt-5 text-center text-xs text-slate-400">
              © {new Date().getFullYear()} SmartClear AI. Authorized users only.
            </p>
          </motion.div>
        </section>
      </div>
    </main>
  );
}

export default Login;