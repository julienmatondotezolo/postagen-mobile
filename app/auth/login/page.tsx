"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useHaptics } from "@/lib/haptics";

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const haptics = useHaptics();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await login(email, password);
    if (result.error) {
      haptics.longError();
      setError(result.error);
      setIsSubmitting(false);
    } else {
      haptics.success();
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-mood-onboarding px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-gray-900">
            Postagen
          </h1>
          <p className="mt-2 text-sm text-gray-500">{t("auth.loginSubtitle")}</p>
        </div>

        {/* Card */}
        <div className="rounded-[32px] bg-white p-8 shadow-sm border border-gray-50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
                {t("auth.email")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => haptics.tap()}
                placeholder={t("auth.emailPlaceholder")}
                required
                autoComplete="email"
                className="w-full rounded-2xl border border-gray-100 bg-white/80 backdrop-blur-sm px-4 py-3.5 text-sm text-gray-900 outline-none transition-all focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
                {t("auth.password")}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => haptics.tap()}
                  placeholder={t("auth.passwordPlaceholder")}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-2xl border border-gray-100 bg-white/80 backdrop-blur-sm px-4 py-3.5 pr-12 text-sm text-gray-900 outline-none transition-all focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-[#8B5CF6] px-6 py-4 text-base font-semibold text-white shadow-xl shadow-purple-200 transition-all hover:bg-purple-600 hover:shadow-2xl hover:shadow-purple-300 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {isSubmitting ? t("common.loading") : t("auth.loginBtn")}
            </button>
          </form>
        </div>

        {/* Register link */}
        <p className="mt-6 text-center text-sm text-gray-500">
          {t("auth.noAccount")}{" "}
          <Link href="/auth/register" className="font-semibold text-[#8B5CF6] hover:text-purple-700">
            {t("auth.registerLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
