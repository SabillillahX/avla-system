"use client"

import { Button } from "@/lib/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/lib/components/ui/dialog"
import { Download } from "lucide-react"
import { CertificateTemplate, type CertificateData } from "./CertificateTemplate"
import { printCertificate } from "./print-certificate"

interface CertificateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: CertificateData
  sample?: boolean
}

export function CertificateDialog({ open, onOpenChange, data, sample = false }: CertificateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-gray-900 sm:max-w-[980px] max-h-[92vh] overflow-y-auto rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
            {sample ? "Certificate Preview" : "Your Certificate"}
          </DialogTitle>
          <DialogDescription>
            {sample
              ? "This is how the certificate will look. Students receive it with their own name once they complete the course."
              : "Congratulations on completing this course. Download your certificate as a PDF below."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <CertificateTemplate {...data} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!sample && (
            <Button onClick={() => printCertificate(data)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
