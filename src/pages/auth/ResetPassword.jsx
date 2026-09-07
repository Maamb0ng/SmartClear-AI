import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { motion } from "framer-motion";
import { FaLock, FaEye, FaEyeSlash, FaRobot } from "react-icons/fa";

import { supabase } from "../../services/supabase";

import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";

function ResetPassword() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      Swal.fire({
        icon: "error",
        title: "Passwords do not match",
      });

      return;
    }

    if (password.length < 6) {
      Swal.fire({
        icon: "warning",
        title: "Password too short",
        text: "Password must be at least 6 characters.",
      });

      return;
    }

    try {
      setLoading(true);

      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) throw error;

      Swal.fire({
        icon: "success",
        title: "Password Updated",
        text: "You may now log in with your new password.",
      });

      navigate("/login");
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Reset Failed",
        text: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 flex items-center justify-center p-6">

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
      >

        <Card className="w-full max-w-md p-8">

          <div className="text-center mb-8">

            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">

              <FaRobot
                size={40}
                className="text-blue-700"
              />

            </div>

            <h2 className="text-3xl font-bold">
              Reset Password
            </h2>

            <p className="text-slate-500 mt-2">
              Enter your new password.
            </p>

          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            <Input
              label="New Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              leftIcon={<FaLock />}
              rightIcon={
                showPassword ? (
                  <FaEyeSlash />
                ) : (
                  <FaEye />
                )
              }
              onRightIconClick={() =>
                setShowPassword(!showPassword)
              }
            />

            <Input
              label="Confirm Password"
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              leftIcon={<FaLock />}
              rightIcon={
                showConfirmPassword ? (
                  <FaEyeSlash />
                ) : (
                  <FaEye />
                )
              }
              onRightIconClick={() =>
                setShowConfirmPassword(
                  !showConfirmPassword
                )
              }
            />

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading
                ? "Updating..."
                : "Update Password"}
            </Button>

          </form>

        </Card>

      </motion.div>

    </div>
  );
}

export default ResetPassword;