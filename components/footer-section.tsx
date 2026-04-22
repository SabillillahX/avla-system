import Link from "next/link"

export default function FooterSection() {
  return (
    <footer className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="grid gap-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900">Avla</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-gray-600">
            LMS profesional untuk pembuatan soal berbasis AI dari video pembelajaran,
            dirancang untuk institusi pendidikan dan corporate learning.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-900">Product</h4>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li><Link href="#features">Features</Link></li>
            <li><Link href="#pricing">Pricing</Link></li>
            <li><Link href="/auth/login">Dashboard</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-900">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li><Link href="/auth/login">Contact</Link></li>
            <li><Link href="/auth/login">Support</Link></li>
            <li><Link href="/auth/register">Start Free</Link></li>
          </ul>
        </div>
      </div>

      <div className="mt-8 border-t border-gray-200 pt-4 text-xs text-gray-500">
        (c) Avla System 2026. All rights reserved.
      </div>
    </footer>
  )
}
