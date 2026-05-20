export default function DocumentationSection() {
  const items = [
    {
      title: "AI Video Processing",
      description:
        "Advanced AI-powered analysis of video content to automatically generate questions and assessments.",
    },
    {
      title: "Real-time Collaboration",
      description:
        "Work simultaneously with your team on video assessment projects in real-time.",
    },
    {
      title: "Advanced Analytics",
      description:
        "Get detailed insights into video performance and engagement metrics.",
    },
  ]

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-blue-700">Platform Features</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
            Platform SaaS profesional untuk layanan teknologi informasi terkelola
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-600 sm:text-base">
            Dirancang untuk perusahaan yang membutuhkan layanan teknologi informasi terkelola
            yang cepat, aman, dan siap digunakan.
          </p>
          <div className="mt-6 space-y-4">
            {items.map((item) => (
              <div key={item.title} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="text-sm font-semibold text-gray-900 sm:text-base">{item.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-3">
          <img
            src="/lms-dummy.svg"
            alt="LMS product preview"
            className="h-full min-h-[280px] w-full rounded-lg object-cover"
          />
        </div>
      </div>
    </section>
  )
}