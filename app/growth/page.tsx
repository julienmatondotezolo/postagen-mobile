"use client";

interface MetricCard {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const metrics: MetricCard[] = [
  {
    title: "Engagement Rate",
    value: "4.2%",
    change: "+0.8%",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
    color: "text-pink-600",
    bgColor: "bg-pink-50",
  },
  {
    title: "Best Posting Times",
    value: "12:00",
    change: "Wed & Fri",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  {
    title: "Top Posts",
    value: "12",
    change: "This month",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
    color: "text-violet-600",
    bgColor: "bg-violet-50",
  },
  {
    title: "Follower Growth",
    value: "+248",
    change: "Last 30 days",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
];

export default function Growth() {
  return (
    <div className="min-h-screen bg-mood-plan pb-24">
      <div className="mx-auto max-w-md px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <p className="mb-1 text-sm font-medium text-gray-500">
            Performance Metrics
          </p>
          <h1 className="text-4xl font-bold text-gray-900">
            Track Your{" "}
            <span className="font-serif italic font-normal text-violet-600">
              Growth
            </span>
          </h1>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {metrics.map((metric) => (
            <div
              key={metric.title}
              className="relative overflow-hidden rounded-3xl bg-white p-5 shadow-sm border border-gray-50"
            >
              {/* Lock Badge */}
              <div className="absolute top-3 right-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100">
                  <svg
                    className="h-3.5 w-3.5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                    />
                  </svg>
                </div>
              </div>

              {/* Icon */}
              <div
                className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${metric.bgColor} ${metric.color}`}
              >
                {metric.icon}
              </div>

              {/* Value */}
              <p className="text-2xl font-bold text-gray-900 mb-0.5">
                {metric.value}
              </p>

              {/* Title */}
              <p className="text-xs font-semibold text-gray-500 mb-1">
                {metric.title}
              </p>

              {/* Change */}
              <p className="text-[10px] font-medium text-gray-400">
                {metric.change}
              </p>
            </div>
          ))}
        </div>

        {/* Placeholder Chart */}
        <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm border border-gray-50 relative overflow-hidden">
          {/* Lock Overlay */}
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-50">
                  <svg
                    className="h-6 w-6 text-[#8B5CF6]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-sm font-bold text-gray-700">Premium Analytics</p>
              <p className="text-xs text-gray-400 mt-0.5">Detailed insights &amp; trends</p>
            </div>
          </div>

          <h3 className="mb-4 text-sm font-bold text-gray-900">
            Weekly Engagement
          </h3>

          {/* Fake Chart Bars */}
          <div className="flex items-end gap-2 h-32">
            {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-lg bg-purple-100"
                  style={{ height: `${height}%` }}
                />
                <span className="text-[9px] text-gray-400 font-medium">
                  {["M", "T", "W", "T", "F", "S", "S"][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-3xl bg-gradient-to-br from-[#8B5CF6] to-purple-700 p-6 text-center shadow-xl shadow-purple-200">
          <div className="mb-3 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
                />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            Coming soon — Premium analytics
          </h3>
          <p className="text-sm text-purple-200 leading-relaxed">
            Get deep insights into your content performance, optimal posting
            times, and audience growth trends.
          </p>
        </div>
      </div>
    </div>
  );
}
