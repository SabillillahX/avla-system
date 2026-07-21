"use client";

import React from "react";
import { motion } from "motion/react";
import { TestimonialsColumn, type Testimonial } from "@/lib/components/ui/testimonials-columns-1";

const testimonials: Testimonial[] = [
  {
    text: "Platform Avla memungkinkan kami membuat dan mengevaluasi kuis dari video pembelajaran dengan sangat mudah dan efisien.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&q=80&auto=format&fit=crop&crop=face",
    name: "Dra. Susi",
    role: "Kepala Sekolah SMA Negeri 1 Jakarta",
  },
  {
    text: "Sistem AI untuk pembuatan soal otomatis dari video sangat membantu menghemat waktu tim pengajar kami.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&q=80&auto=format&fit=crop&crop=face",
    name: "Michael Chen",
    role: "Koordinator Pelatihan Korporat",
  },
  {
    text: "Integrasi dengan LMS kami berjalan mulus, dan hasil evaluasi siswa jauh lebih akurat dari sebelumnya.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&q=80&auto=format&fit=crop&crop=face",
    name: "Budi Santoso",
    role: "Direktur Pembelajaran Online",
  },
  {
    text: "Fitur analitik real-time memungkinkan kami memantau kemajuan belajar setiap siswa secara individual.",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&q=80&auto=format&fit=crop&crop=face",
    name: "Rina Wijaya",
    role: "Manajer Pengembangan SDM",
  },
  {
    text: "Avla mengubah cara kami menyajikan materi pelatihan. Kini setiap sesi lebih interaktif dan terukur.",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&h=80&q=80&auto=format&fit=crop&crop=face",
    name: "Andri Kusuma",
    role: "Chief Learning Officer",
  },
  {
    text: "Implementasinya cepat dan tim support sangat responsif. Kami berhasil onboarding dalam waktu satu minggu.",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&q=80&auto=format&fit=crop&crop=face",
    name: "Dewi Lestari",
    role: "IT Manager Pendidikan",
  },
  {
    text: "Soal yang dihasilkan AI sangat relevan dengan konten video. Tingkat pemahaman siswa meningkat signifikan.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&q=80&auto=format&fit=crop&crop=face",
    name: "Farhan Siddiqui",
    role: "Koordinator Kurikulum",
  },
  {
    text: "Dashboard yang intuitif membuat tim kami langsung produktif tanpa perlu pelatihan panjang.",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&q=80&auto=format&fit=crop&crop=face",
    name: "Sana Sheikh",
    role: "Manajer Program Pelatihan",
  },
  {
    text: "Sistem penilaian semantik Avla jauh melampaui ekspektasi kami dalam hal akurasi dan keandalan.",
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&h=80&q=80&auto=format&fit=crop&crop=face",
    name: "Hassan Ali",
    role: "Direktur Teknologi Pendidikan",
  },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

export default function TestimonialsSection() {
  return (
    <section className="relative py-4">
      {/* Subtle background glow matching hero palette */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-60 w-[600px] rounded-full bg-purple-600/20 blur-[80px]" />
        <div className="absolute bottom-0 right-0 h-40 w-80 rounded-full bg-sky-600/10 blur-[60px]" />
      </div>

      <div className="mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center max-w-[540px] mx-auto mb-10"
        >
          <div className="flex justify-center mb-4">
            <div className="border border-white/20 bg-white/5 backdrop-blur-sm py-1 px-4 rounded-full text-xs font-medium text-gray-300 tracking-wider uppercase">
              Customer Stories
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white text-center">
            Dipercaya institusi pendidikan &amp; korporat
          </h2>
          <p className="text-center mt-4 text-gray-400 text-sm">
            Lihat apa yang dikatakan pelanggan kami tentang pengalaman belajar bersama Avla.
          </p>
        </motion.div>

        {/* Scrolling columns */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="flex justify-center gap-6 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)] max-h-[620px] overflow-hidden"
        >
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn
            testimonials={secondColumn}
            className="hidden md:block"
            duration={19}
          />
          <TestimonialsColumn
            testimonials={thirdColumn}
            className="hidden lg:block"
            duration={17}
          />
        </motion.div>
      </div>
    </section>
  );
}