import { motion } from "framer-motion";

function DashboardCard({
  title,
  value,
  icon,
  color = "bg-blue-600",
  textColor = "text-white",
}) {
  return (
    <motion.div
      whileHover={{
        y: -6,
        scale: 1.02,
      }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl bg-white p-6 shadow-lg"
    >
      <div className="flex items-center justify-between">

        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <h2 className="mt-2 text-4xl font-bold text-slate-800">
            {value}
          </h2>
        </div>

        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl ${color} ${textColor}`}
        >
          <div className="text-3xl">
            {icon}
          </div>
        </div>

      </div>
    </motion.div>
  );
}

export default DashboardCard;