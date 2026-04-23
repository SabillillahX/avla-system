import { Button } from "@/components/ui/button"

const plans = [
  {
    name: "Starter",
    price: "Rp0",
    period: "/bulan",
    description: "Untuk tim kecil yang mulai digitalisasi kelas.",
    features: ["2 kelas aktif", "AI quiz basic", "Laporan mingguan"],
    cta: "Mulai Gratis",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "Rp299K",
    period: "/bulan",
    description: "Untuk institusi yang butuh skala dan kontrol evaluasi.",
    features: ["Kelas tanpa batas", "Adaptive quiz per timestamp", "Analytics lanjutan"],
    cta: "Pilih Professional",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Untuk kebutuhan integrasi SSO, SLA, dan multi-tenant.",
    features: ["On-prem atau private cloud", "Dedicated support", "Custom AI policy"],
    cta: "Hubungi Sales",
    highlighted: false,
  },
]

export default function PricingSection() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="text-center">
        <p className="text-sm font-medium text-blue-700">Pricing</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
          Paket fleksibel untuk setiap tahap pertumbuhan
        </h2>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={`rounded-xl border p-5 ${
              plan.highlighted
                ? "border-blue-200 bg-blue-50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
            <p className="mt-1 text-sm text-gray-600">{plan.description}</p>
            <div className="mt-4">
              <span className="text-3xl font-semibold text-gray-900">{plan.price}</span>
              <span className="text-sm text-gray-600">{plan.period}</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              {plan.features.map((feature) => (
                <li key={feature}>- {feature}</li>
              ))}
            </ul>
            <Button className="mt-6 w-full text-white" variant={plan.highlighted ? "default" : "outline"}>
              {plan.cta}
            </Button>
          </article>
        ))}
      </div>
    </section>
  )
}
