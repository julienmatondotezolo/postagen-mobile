"use client";

import { usePathname, useRouter } from "next/navigation";

interface NavItem {
  label: string;
  path: string;
  icon: (active: boolean) => React.ReactNode;
  isCentral?: boolean;
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Hide nav on wizard flow pages and processing
  if (pathname.startsWith("/create") || pathname === "/upload" || pathname === "/processing") {
    return null;
  }

  const navItems: NavItem[] = [
    {
      label: "Home",
      path: "/home",
      icon: (active: boolean) => (
        <svg
          className="h-6 w-6"
          fill={active ? "currentColor" : "none"}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={active ? 0 : 1.8}
        >
          {active ? (
            <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 01-.53 1.28h-1.44v7.44a.75.75 0 01-.75.75h-3a.75.75 0 01-.75-.75V16.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75v4.75a.75.75 0 01-.75.75h-3a.75.75 0 01-.75-.75v-7.44H4.31a.75.75 0 01-.53-1.28l8.69-8.69z" />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
            />
          )}
        </svg>
      ),
    },
    {
      label: "Calendar",
      path: "/calendar",
      icon: (active: boolean) => (
        <svg
          className="h-6 w-6"
          fill={active ? "currentColor" : "none"}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={active ? 0 : 1.8}
        >
          {active ? (
            <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
            />
          )}
        </svg>
      ),
    },
    {
      label: "",
      path: "/create",
      icon: () => (
        <svg
          className="h-7 w-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      ),
      isCentral: true,
    },
    {
      label: "Growth",
      path: "/growth",
      icon: (active: boolean) => (
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
    },
    {
      label: "Profile",
      path: "/profile",
      icon: (active: boolean) => (
        <svg
          className="h-6 w-6"
          fill={active ? "currentColor" : "none"}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={active ? 0 : 1.8}
        >
          {active ? (
            <>
              <path
                fillRule="evenodd"
                d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
                clipRule="evenodd"
              />
            </>
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          )}
        </svg>
      ),
    },
  ];

  const isActive = (path: string) => {
    if (path === "/home") {
      return (
        pathname === "/home" ||
        pathname === "/plans" ||
        pathname.startsWith("/plan/") ||
        pathname.startsWith("/post/")
      );
    }
    return pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white/95 backdrop-blur-md safe-area-bottom">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 pb-1 pt-2">
        {navItems.map((item, index) => {
          const active = isActive(item.path);

          if (item.isCentral) {
            return (
              <button
                key={index}
                onClick={() => router.push(item.path)}
                className="relative -mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-[#8B5CF6] shadow-lg shadow-purple-300/50 transition-all hover:scale-110 hover:shadow-xl hover:shadow-purple-400/50 active:scale-95"
              >
                <div className="text-white">{item.icon(false)}</div>
              </button>
            );
          }

          return (
            <button
              key={index}
              onClick={() => router.push(item.path)}
              className="flex flex-col items-center gap-0.5 py-1 px-3 transition-all"
            >
              <div
                className={`transition-colors ${
                  active
                    ? "text-[#8B5CF6]"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {item.icon(active)}
              </div>
              <span
                className={`text-[10px] font-semibold transition-colors ${
                  active
                    ? "text-[#8B5CF6]"
                    : "text-gray-400 hover:text-gray-600"
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
