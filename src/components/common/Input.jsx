import { forwardRef } from "react";
import { motion } from "framer-motion";

const Input = forwardRef(
  (
    {
      label,
      type = "text",
      placeholder = "",
      value,
      onChange,
      name,
      error,
      required = false,
      disabled = false,

      leftIcon,
      rightIcon,
      onRightIconClick,

      className = "",
      inputClassName = "",

      ...props
    },
    ref
  ) => {
    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}

        <motion.div
          whileFocus={{ scale: 1.01 }}
          className={`flex items-center rounded-xl border bg-white transition-all duration-300
          ${
            error
              ? "border-red-500"
              : "border-slate-300 focus-within:border-blue-600"
          }
          focus-within:ring-4 focus-within:ring-blue-100`}
        >
          {leftIcon && (
            <div className="pl-4 text-slate-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full bg-transparent px-4 py-3 outline-none ${inputClassName}`}
            {...props}
          />

          {rightIcon && (
            <button
              type="button"
              onClick={onRightIconClick}
              className="px-4 text-slate-400 transition hover:text-blue-600"
            >
              {rightIcon}
            </button>
          )}
        </motion.div>

        {error && (
          <p className="mt-2 text-sm text-red-500">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;