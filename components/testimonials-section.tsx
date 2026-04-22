const testimonials = [
  {
    quote:
      "Fitur pembuatan soal dari video memotong waktu authoring kami lebih dari 70%.",
    name: "Nadia Putri",
    role: "Academic Operations Lead",
  },
  {
    quote:
      "Mekanisme kuis per timestamp membantu tim pengajar meningkatkan engagement kelas online.",
    name: "Rafi Maulana",
    role: "Head of Learning Technology",
  },
  {
    quote:
      "Evaluasi server-side memberi kepercayaan penuh untuk ujian berbasis video.",
    name: "Alya Prasetyo",
    role: "Curriculum Manager",
  },
]

export default function TestimonialsSection() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-blue-700">Customer Stories</p>
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
          Dipercaya tim edukasi dan training modern
        </h2>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {testimonials.map((item) => (
          <article key={item.name} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-sm leading-6 text-gray-700">\"{item.quote}\"</p>
            <div className="mt-5 border-t border-gray-200 pt-4">
              <p className="text-sm font-semibold text-gray-900">{item.name}</p>
              <p className="text-xs text-gray-600">{item.role}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-3">
        <img
          src="/lms-dummy.svg"
          alt="Learning analytics preview"
          className="h-[220px] w-full rounded-lg object-cover"
        />
      </div>
    </section>
  )
}
