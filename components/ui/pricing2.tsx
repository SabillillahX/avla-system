"use client";

import { ArrowRight, CircleCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

interface PricingFeature {
  text: string;
}

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  features: PricingFeature[];
  button: {
    text: string;
    url: string;
  };
}

interface Pricing2Props {
  heading?: string;
  description?: string;
  plans?: PricingPlan[];
}

const Pricing2 = ({
  heading = "Paket Harga",
  description = "Paket fleksibel untuk kebutuhan bisnis Anda — mulai gratis, skalakan sesuai pertumbuhan.",
  plans = [
    {
      id: "starter",
      name: "Starter",
      description: "Untuk tim kecil yang mulai menggunakan AI Assessment.",
      monthlyPrice: "Rp0",
      yearlyPrice: "Rp0",
      features: [
        { text: "2 video aktif per bulan" },
        { text: "Assessment dasar (5 soal/video)" },
        { text: "Dukungan komunitas" },
        { text: "Laporan mingguan" },
      ],
      button: {
        text: "Mulai Gratis",
        url: "/auth/register",
      },
    },
    {
      id: "professional",
      name: "Professional",
      description: "Untuk organisasi yang butuh skala dan kontrol penuh.",
      monthlyPrice: "Rp299K",
      yearlyPrice: "Rp239K",
      features: [
        { text: "Video tanpa batas" },
        { text: "Assessment adaptif (Bloom's Taxonomy)" },
        { text: "Analytics lanjutan & monitoring 24/7" },
        { text: "Penyimpanan cloud 50 GB" },
      ],
      button: {
        text: "Pilih Professional",
        url: "/auth/register",
      },
    },
  ],
}: Pricing2Props) => {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section className="py-32">
      <div className="container">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
          <h2 className="text-pretty text-4xl font-bold lg:text-6xl">
            {heading}
          </h2>
          <p className="text-muted-foreground lg:text-xl">{description}</p>
          <div className="flex items-center gap-3 text-lg">
            Bulanan
            <Switch
              checked={isYearly}
              onCheckedChange={() => setIsYearly(!isYearly)}
            />
            Tahunan
            {isYearly && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-sm font-medium text-green-700">
                Hemat 20%
              </span>
            )}
          </div>
          <div className="flex flex-col items-stretch gap-6 md:flex-row">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`flex w-80 flex-col justify-between text-left ${
                  plan.id === "professional"
                    ? "border-blue-500 ring-2 ring-blue-500/30"
                    : ""
                }`}
              >
                <CardHeader>
                  {plan.id === "professional" && (
                    <span className="mb-2 w-fit rounded-full bg-blue-600 px-3 py-0.5 text-xs font-semibold text-white">
                      Paling Populer
                    </span>
                  )}
                  <CardTitle>
                    <p>{plan.name}</p>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                  <span className="text-4xl font-bold">
                    {isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                  </span>
                  <p className="text-muted-foreground text-sm">
                    {plan.id === "starter"
                      ? "Selamanya gratis"
                      : isYearly
                      ? "Ditagihkan per tahun"
                      : "Ditagihkan per bulan"}
                  </p>
                </CardHeader>
                <CardContent>
                  <Separator className="mb-6" />
                  {plan.id === "professional" && (
                    <p className="mb-3 font-semibold">
                      Semua di Starter, ditambah:
                    </p>
                  )}
                  <ul className="space-y-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CircleCheck className="size-4 text-blue-600 shrink-0" />
                        <span>{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="mt-auto">
                  <Button
                    asChild
                    className={`w-full ${
                      plan.id === "professional"
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : ""
                    }`}
                    variant={plan.id === "professional" ? "default" : "outline"}
                  >
                    <a href={plan.button.url}>
                      {plan.button.text}
                      <ArrowRight className="ml-2 size-4" />
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Butuh paket khusus?{" "}
            <a
              href="/auth/register"
              className="font-medium text-blue-600 underline underline-offset-4 hover:text-blue-700"
            >
              Hubungi tim kami
            </a>{" "}
            untuk solusi Enterprise.
          </p>
        </div>
      </div>
    </section>
  );
};

export { Pricing2 };
