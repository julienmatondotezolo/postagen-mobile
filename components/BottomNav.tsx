"use client";

import { usePathname, useRouter } from "next/navigation";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  isCentral?: boolean;
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Don't show nav on onboarding/processing screens
  const hideNavPaths = ["/", "/processing"];
  if (hideNavPaths.includes(pathname)) {
    return null;
  }

  const navItems: NavItem[] = [
    {
      label: "HOME",
      path: "/my-plans",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      label: "EXPLORE",
      path: "/growth",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      ),
    },
    {
      label: "",
      path: "/upload",
      icon: (
        <svg
          className="h-7 w-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      ),
      isCentral: true,
    },
    {
      label: "PLANS",
      path: "/plans",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      label: "PROFILE",
      path: "/brand",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
  ];

  const isActive = (path: string) => {
    if (path === "/plans") {
      return pathname === "/plans" || pathname.startsWith("/plan/") || pathname.startsWith("/post/");
    }
    if (path === "/my-plans") {
      return pathname === "/my-plans";
    }
    return pathname === path || pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-2">
        {navItems.map((item, index) => {
          const active = isActive(item.path);
          
          if (item.isCentral) {
            return (
              <button
                key={index}
                onClick={() => router.push(item.path)}
                className="relative -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-purple-500 to-purple-600 shadow-lg transition-all hover:scale-110 hover:shadow-xl hover:shadow-purple-300 active:scale-95"
              >
                <div className="text-white">{item.icon}</div>
              </button>
            );
          }

          return (
            <button
              key={index}
              onClick={() => router.push(item.path)}
              className="flex flex-col items-center gap-1 transition-all hover:scale-105"
            >
              <div
                className={`transition-colors ${
                  active ? "text-purple-600" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {item.icon}
              </div>
              <span
                className={`text-xs font-medium transition-colors ${
                  active ? "text-purple-600" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
