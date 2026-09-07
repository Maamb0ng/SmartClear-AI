import { motion } from "framer-motion";

function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  onClick,
}) {
  const baseClasses =
    "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-300 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60";

  const variants = {
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-200",

    secondary:
      "border border-blue-600 bg-white text-blue-600 hover:bg-blue-50 focus:ring-blue-100",

    danger:
      "bg-red-600 text-white hover:bg-red-700 focus:ring-red-200",

    success:
      "bg-green-600 text-white hover:bg-green-700 focus:ring-green-200",

    ghost:
      "bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-200",
  };

  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-5 py-2.5 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.03 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </motion.button>
  );
}

export default Button;