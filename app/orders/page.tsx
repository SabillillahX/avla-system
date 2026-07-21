"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/lib/components/auth/ProtectedRoute"
import DashboardLayout from "@/lib/components/dashboard-layout"
import { format, parseISO } from "date-fns"
import {
  Receipt,
  Search,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  FileText
} from "lucide-react"
import { Badge } from "@/lib/components/ui/badge"
import { Button } from "@/lib/components/ui/button"
import { Input } from "@/lib/components/ui/input"
import { CheckoutModal } from "@/lib/components/CheckoutModal"
import { InvoiceDetails } from "@/lib/types/checkout-modal"
import { Transaction } from "@/lib/types/orders"
import Script from "next/script"



export default function OrderHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetails | null>(null)
  const [isCanceling, setIsCanceling] = useState(false)

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const token = localStorage.getItem("auth_token")
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/transactions`, {
          headers: {
            "Accept": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          }
        })
        const data = await response.json()
        if (data && data.data) {
          setTransactions(data.data)
        }
      } catch (err) {
        console.error("Failed to fetch transactions:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransactions()
  }, [])

  const filteredTransactions = transactions.filter(t =>
    t.course_class?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSeeDetails = (tx: Transaction) => {
    const basePrice = Math.round(Number(tx.amount) / 1.05);
    const calculatedAdminFee = Number(tx.amount) - basePrice;

    setSelectedInvoice({
      transaction_id: tx.id,
      course_name: tx.course_class?.name || "Unknown Course",
      base_price: basePrice,
      admin_fee: calculatedAdminFee,
      total_amount: Number(tx.amount),
      status: tx.status,
      snap_token: tx.snap_token,
      payment_url: tx.payment_url
    });
  }

  const handlePayNow = () => {
    if (!selectedInvoice || !selectedInvoice.snap_token) return;

    // @ts-ignore
    if (window.snap) {
      // @ts-ignore
      window.snap.pay(selectedInvoice.snap_token, {
        onSuccess: function () {
          setTransactions(prev => prev.map(t => t.id === selectedInvoice.transaction_id ? { ...t, status: 'success' } : t))
          setSelectedInvoice(null);
        },
        onPending: function () {
          setSelectedInvoice(null);
        },
        onError: function () {
          setSelectedInvoice(null);
        },
        onClose: function () {
        }
      });
    } else if (selectedInvoice.payment_url) {
      window.open(selectedInvoice.payment_url, '_blank');
    }
  }

  const handleCancelOrder = async () => {
    if (!selectedInvoice) return;
    setIsCanceling(true)
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/transactions/${selectedInvoice.transaction_id}/cancel`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      });
      if (response.ok) {
        setTransactions(prev => prev.map(t => t.id === selectedInvoice.transaction_id ? { ...t, status: 'canceled' } : t))
        setSelectedInvoice(null);
      } else {
        const data = await response.json();
        alert(data.message || "Failed to cancel order");
      }
    } catch (err: any) {
      alert(err.message || "Failed to cancel order");
    } finally {
      setIsCanceling(false)
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
      case 'capture':
      case 'settlement':
        return {
          color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
          icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
        }
      case 'pending':
        return {
          color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
          icon: <Clock className="w-3.5 h-3.5 mr-1" />
        }
      default:
        return {
          color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          icon: <XCircle className="w-3.5 h-3.5 mr-1" />
        }
    }
  }

  return (
    <ProtectedRoute>
      <Script
        src={process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL}
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="lazyOnload"
      />
      <DashboardLayout>
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Order History
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                Track and manage your past course purchases and transactions.
              </p>
            </div>

            <div className="relative w-full md:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white dark:bg-gray-900"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/80 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-medium">
                  <tr>
                    <th className="px-6 py-4 rounded-tl-2xl">Order Details</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 rounded-tr-2xl text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        Loading your orders...
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                          <p className="text-gray-500 dark:text-gray-400">No transactions found.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const statusConfig = getStatusConfig(tx.status)

                      return (
                        <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-gray-900 dark:text-white mb-1">
                                {tx.course_class?.name || "Unknown Course"}
                              </span>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="uppercase text-[10px] tracking-wider bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400">
                                  #{tx.id.split('-')[0]}
                                </span>
                                <span>•</span>
                                <span>{format(parseISO(tx.created_at), 'MMM dd, yyyy HH:mm')}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-medium text-gray-900 dark:text-white">
                              Rp {Number(tx.amount).toLocaleString('id-ID')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={`border-0 font-medium ${statusConfig.color} shadow-none`}>
                              {statusConfig.icon}
                              {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSeeDetails(tx)}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-blue-900/30"
                            >
                              See Details <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Invoice Modal */}
        {selectedInvoice && (
          <CheckoutModal
            invoice={selectedInvoice}
            onClose={() => setSelectedInvoice(null)}
            onPay={handlePayNow}
            onPayLater={() => setSelectedInvoice(null)}
            onCancel={handleCancelOrder}
            isCanceling={isCanceling}
          />
        )}
      </DashboardLayout>
    </ProtectedRoute>
  )
}
