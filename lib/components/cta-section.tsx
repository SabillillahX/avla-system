import Link from "next/link"
import { Button } from "@/lib/components/ui/button"

export default function CTASection() {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="grid items-center gap-6 lg:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-blue-700">Get Started</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
            Siap meluncurkan platform video assessment berbasis AI?
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-600 sm:text-base">
            Mulai dengan solusi yang sesuai kebutuhan Anda, lalu skalakan ke seluruh organisasi.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild className="bg-[#22C55E] text-white hover:bg-[#16A34A]">
              <Link href="/auth/register">Mulai Sekarang</Link>
            </Button>
            <Button asChild variant="outline" className="border-[#1E40AF] text-[#1E40AF] hover:bg-[#1E40AF] hover:text-white">
              <Link href="/auth/login">Lihat Demo</Link>
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-3">
          <img
            src="/lms-dummy.svg"
            alt="LMS call to action preview"
            className="h-[220px] w-full rounded-lg object-cover"
          />
        </div>
      </div>
    </section>
  )
}
