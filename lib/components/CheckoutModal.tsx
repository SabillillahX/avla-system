"use client"

import { Button } from "@/lib/components/ui/button"
import { ShieldCheck, CreditCard, X } from "lucide-react"

import { InvoiceDetails } from "@/lib/types/checkout-modal"

export function CheckoutModal({
  invoice,
  onClose,
  onPay,
  onPayLater,
  onCancel,
  isCanceling = false
}: {
  invoice: InvoiceDetails
  onClose: () => void
  onPay: () => void
  onPayLater: () => void
  onCancel: () => void
  isCanceling?: boolean
}) {
  const isPending = invoice.status === 'pending'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 md:p-6 animate-in fade-in duration-200">
      <div className="bg-[#f8f9fa] dark:bg-gray-950 w-[96vw] max-w-6xl min-h-[80vh] md:min-h-[600px] lg:min-h-[700px] rounded-xl md:rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh] md:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:px-10 md:py-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <h2 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            Checkout Details
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 w-10 h-10">
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto">
          {/* Left Column - Payment Info Placeholder */}
          <div className="flex-1 p-5 md:p-10 space-y-6 md:space-y-8 bg-white dark:bg-gray-900">
            <div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4 md:mb-5">Payment method</h3>
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 md:p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <input type="radio" checked readOnly className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300" />
                    <span className="font-semibold text-base md:text-lg text-gray-900 dark:text-white">Midtrans Secure Payment</span>
                  </div>
                </div>
                <div className="p-6 md:p-8 text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                  <p>In order to complete your transaction, we will transfer you over to Midtrans's secure servers.</p>
                  <p className="mt-3">You will be able to securely pay via Credit Card, Bank Transfer, Virtual Account, GoPay, ShopeePay, or your preferred e-wallet.</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-5 rounded-xl flex gap-4 text-sm md:text-base border border-blue-100 dark:border-blue-800/30">
              <ShieldCheck className="w-6 h-6 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-200">Secure connection</p>
                <p className="opacity-90 mt-1.5 leading-relaxed">All transactions are encrypted and secured by Midtrans. We never store your payment credentials on our servers.</p>
              </div>
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="w-full md:w-[380px] lg:w-[480px] shrink-0 bg-gray-50/50 dark:bg-gray-950 p-6 md:p-10 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-800 flex flex-col justify-between">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-6 md:mb-8">Order summary</h3>

              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="text-base md:text-lg font-medium text-gray-900 dark:text-white line-clamp-3 leading-snug">
                    {invoice.course_name}
                  </div>
                  <div className="text-base md:text-lg font-medium text-gray-900 dark:text-white shrink-0">
                    Rp {invoice.base_price.toLocaleString('id-ID')}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm md:text-base text-gray-500 dark:text-gray-400">
                  <span>Admin Fee (0.05%)</span>
                  <span>Rp {invoice.admin_fee.toLocaleString('id-ID')}</span>
                </div>

                <div className="h-px bg-gray-200 dark:bg-gray-800 my-6" />

                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg md:text-xl text-gray-900 dark:text-white">Total</span>
                  <span className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Rp {invoice.total_amount.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="mt-3 inline-flex">
                  <span className={`text-xs md:text-sm px-3 py-1.5 rounded-md font-semibold uppercase tracking-widest ${invoice.status === 'success' || invoice.status === 'settlement' || invoice.status === 'capture' ? 'bg-emerald-100 text-emerald-700' :
                    invoice.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                    Status: {invoice.status}
                  </span>
                </div>
              </div>

              <div className="mt-10 text-xs md:text-sm text-gray-500 dark:text-gray-400 text-center px-2">
                By completing your purchase, you agree to our Terms of Use and Privacy Policy.
              </div>
            </div>

            <div className="mt-8 md:mt-12 space-y-4">
              {isPending ? (
                <>
                  <Button
                    onClick={onPay}
                    className="w-full h-14 md:h-16 text-lg md:text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 rounded-xl"
                  >
                    <ShieldCheck className="w-6 h-6 mr-2 md:mr-3" /> Pay Rp {invoice.total_amount.toLocaleString('id-ID')}
                  </Button>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <Button variant="outline" onClick={onPayLater} className="w-full border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300 h-12 md:h-14 rounded-xl text-sm md:text-base font-semibold">
                      Pay Later
                    </Button>
                    <Button
                      variant="outline"
                      onClick={onCancel}
                      disabled={isCanceling}
                      className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/30 dark:hover:bg-red-900/20 h-12 md:h-14 rounded-xl text-sm md:text-base font-semibold"
                    >
                      {isCanceling ? "Canceling..." : "Cancel Order"}
                    </Button>
                  </div>
                </>
              ) : (
                <Button variant="outline" onClick={onClose} className="w-full h-12 md:h-14 rounded-xl text-sm md:text-base font-semibold">
                  Close Window
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
