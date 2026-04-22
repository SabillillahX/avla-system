"use client"

import { useState } from "react"

const faqItems = [
  {
    question: "Bagaimana AI membuat soal dari video?",
    answer:
      "Sistem mengekstrak transcript, mengenali topik, lalu menyusun soal sesuai konteks materi beserta opsi jawaban.",
  },
  {
    question: "Apakah jawaban kuis aman dari manipulasi frontend?",
    answer:
      "Ya. Evaluasi dilakukan di server-side. Frontend hanya mengirim quiz_id dan user_answer.",
  },
  {
    question: "Bisakah kuis muncul di waktu tertentu pada video?",
    answer:
      "Bisa. Setiap soal memiliki trigger_time sehingga pertanyaan tampil sesuai momen pembelajaran.",
  },
  {
    question: "Apakah bisa dipakai untuk corporate training?",
    answer:
      "Bisa. Platform mendukung alur kelas internal perusahaan, progress tracking, dan dashboard performa.",
  },
]

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-medium text-blue-700">FAQ</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
          Pertanyaan yang paling sering ditanyakan
        </h2>

        <div className="mt-6 space-y-3">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index
            return (
              <article key={item.question} className="rounded-xl border border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="text-sm font-medium text-gray-900 sm:text-base">{item.question}</span>
                  <span className="text-lg text-gray-500">{isOpen ? "-" : "+"}</span>
                </button>
                {isOpen && <p className="px-4 pb-4 text-sm leading-6 text-gray-600">{item.answer}</p>}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
