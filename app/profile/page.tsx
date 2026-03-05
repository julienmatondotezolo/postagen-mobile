"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n, LanguageSwitcher } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";

interface BrandIdentity {
  businessName?: string;
  websiteUrl?: string;
  description?: string;
}

export default function ProfilePage() {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [brandIdentity, setBrandIdentity] = useState<BrandIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const loadBrand = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/brand-identity`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setBrandIdentity(data.brandIdentity || null);
        }
      } catch (error) {
        console.error("Error loading brand identity:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBrand();
  }, []);

  return (
    <div className="min-h-screen bg-mood-plan pb-28">
      <div className="mx-auto max-w-md px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            {t("profile.title")}
          </h1>
        </div>

        {isLoading ? (
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-r-transparent" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Account Card */}
            {user && (
              <div className="rounded-[32px] bg-white p-6 shadow-sm border border-gray-50">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50">
                    <svg className="h-5 w-5 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">{t("auth.account")}</h2>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      {t("auth.email")}
                    </label>
                    <p className="text-sm font-medium text-gray-900">{user.email}</p>
                  </div>
                  {user.username && (
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {t("auth.username")}
                      </label>
                      <p className="text-sm font-medium text-gray-900">{user.username}</p>
                    </div>
                  )}
                  {!user.email_verified && (
                    <div className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-700">
                      {t("auth.emailNotVerified")}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Brand Identity Card */}
            <div className="rounded-[32px] bg-white p-6 shadow-sm border border-gray-50">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50">
                    <svg className="h-5 w-5 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 7.5h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">{t("profile.brandIdentity")}</h2>
                </div>
                <button
                  onClick={() => router.push("/create")}
                  className="text-sm font-bold text-[#8B5CF6] hover:text-purple-700 transition-colors"
                >
                  {brandIdentity ? t("profile.edit") : t("profile.setup")}
                </button>
              </div>

              {brandIdentity ? (
                <div className="space-y-3">
                  {brandIdentity.businessName && (
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Business Name
                      </label>
                      <p className="text-sm font-medium text-gray-900">{brandIdentity.businessName}</p>
                    </div>
                  )}
                  {brandIdentity.websiteUrl && (
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Website
                      </label>
                      <p className="text-sm text-[#8B5CF6]">{brandIdentity.websiteUrl}</p>
                    </div>
                  )}
                  {brandIdentity.description && (
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Description
                      </label>
                      <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                        {brandIdentity.description}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl bg-purple-50/50 p-4 text-center">
                  <p className="text-sm text-gray-500">
                    No brand identity set up yet.
                  </p>
                  <button
                    onClick={() => router.push("/create")}
                    className="mt-2 text-sm font-bold text-[#8B5CF6]"
                  >
                    Set up now →
                  </button>
                </div>
              )}
            </div>

            {/* Account Settings Card */}
            <div className="rounded-[32px] bg-white p-6 shadow-sm border border-gray-50">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-50">
                  <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-900">{t("profile.settings")}</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-600">{t("profile.language")}</span>
                  <LanguageSwitcher />
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-600">Notifications</span>
                  <div className="flex h-6 w-11 items-center rounded-full bg-[#8B5CF6] px-0.5">
                    <div className="h-5 w-5 translate-x-5 rounded-full bg-white shadow-sm transition-transform" />
                  </div>
                </div>
              </div>
            </div>

            {/* About Card */}
            <div className="rounded-[32px] bg-white p-6 shadow-sm border border-gray-50">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50">
                  <svg className="h-5 w-5 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-900">{t("profile.about")}</h2>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-600">{t("profile.version")}</span>
                  <span className="text-sm font-medium text-gray-900">1.0.0</span>
                </div>
                <div className="h-px bg-gray-100" />
                <div className="py-1 text-center">
                  <p className="text-sm text-gray-500">
                    Made with <span className="text-red-500">❤️</span> in Belgium
                  </p>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={async () => {
                setIsLoggingOut(true);
                await logout();
              }}
              disabled={isLoggingOut}
              className="w-full rounded-2xl border-2 border-red-200 bg-red-50 px-6 py-4 text-sm font-semibold text-red-600 transition-all hover:bg-red-100 hover:border-red-300 active:scale-[0.98] disabled:opacity-50"
            >
              {isLoggingOut ? t("common.loading") : t("auth.logout")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
