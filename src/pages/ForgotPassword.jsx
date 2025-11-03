// src/pages/ForgotPassword.jsx
import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { Link } from "react-router-dom";
const logo = "/logo512.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage("Check your inbox for the password reset link.");
    } catch (err) {
      setError("Failed to send reset email. Please verify the address and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-16 sm:py-20 bg-gradient-to-b from-white to-green-50 dark:from-gray-900 dark:to-gray-800 min-h-screen flex items-center">
      <div className="max-w-6xl w-full px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-gray-700 p-8 animate-fadeIn hover-lift">

          {/* Logo & Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <img src={logo} alt="EcoCycle" className="h-14 w-14 animate-spin-slow motion-safe:animate-spin-slow" />
            </div>
            <h1 className="text-2xl font-extrabold text-primary">Reset your password</h1>
            <p className="text-gray-600 dark:text-white mt-2">Enter the email linked to your account and we'll send instructions to reset your password.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition"
                required
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3.5 rounded-xl hover:bg-accent disabled:opacity-70 disabled:cursor-not-allowed font-semibold text-lg transition shadow-md hover:shadow-lg"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          {/* Messages */}
          {message && (
            <div className="mt-5 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 rounded-xl text-sm">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Links */}
          <div className="mt-6 text-center space-y-3 text-sm">
            <Link to="/login" className="block text-primary hover:underline font-medium">Back to login</Link>
            <p className="text-gray-600 dark:text-white">Remembered your password? <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link></p>
          </div>

          <p className="text-center text-xs text-gray-500 dark:text-white mt-10">© 2025 EcoCycle</p>
        </div>
      </div>
    </section>
  );
}