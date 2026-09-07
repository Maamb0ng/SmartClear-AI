import { motion } from "framer-motion";

function Card({
  children,
  className = "",
  hover = true,
  padding = "p-6",
}) {
  return (
    <motion.div
      whileHover={hover ? { y: -5 } : {}}
      transition={{ duration: 0.25 }}
      className={`
        rounded-2xl
        border border-slate-200
        bg-white
        shadow-sm
        ${padding}
        ${hover ? "hover:shadow-xl" : ""}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}

export default Card;