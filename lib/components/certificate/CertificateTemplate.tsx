"use client"

export interface CertificateData {
  studentName: string
  courseName: string
  instructorName: string
  dateText: string
  certificateId: string
  lectureCount: number
}

export function CertificateTemplate({
  studentName,
  courseName,
  instructorName,
  dateText,
  certificateId,
  lectureCount,
}: CertificateData) {
  return (
    <div className="certificate-print-area mx-auto w-full max-w-[920px] bg-white text-gray-900">
      <div className="relative aspect-[1.414/1] w-full overflow-hidden border border-gray-200 shadow-sm">
        <div className="absolute inset-3 sm:inset-4 border border-gray-200" />

        <div className="relative flex h-full flex-col px-6 py-6 sm:px-12 sm:py-10">
          <div className="flex items-start justify-between">
            <img src="/logo-black.png" alt="Drafin" className="h-7 sm:h-9 w-auto object-contain" />
            <div className="text-right text-[10px] leading-relaxed text-gray-400">
              <p className="uppercase tracking-wide">Certificate no.</p>
              <p className="font-mono font-medium text-gray-600">{certificateId}</p>
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-indigo-600 sm:text-sm">
              Certificate of Completion
            </p>
            <div className="mt-3 h-px w-16 bg-gray-200" />

            <p className="mt-6 text-xs text-gray-500 sm:text-sm">This certifies that</p>
            <h2 className="mt-2 max-w-[90%] border-b-2 border-gray-200 px-4 pb-2 font-display text-2xl font-bold text-gray-900 sm:text-4xl">
              {studentName}
            </h2>

            <p className="mt-6 text-xs text-gray-500 sm:text-sm">has successfully completed the online course</p>
            <h3 className="mt-2 max-w-[85%] text-lg font-semibold leading-snug text-gray-800 sm:text-2xl">
              {courseName}
            </h3>
          </div>

          <div className="mt-auto grid grid-cols-3 items-end gap-4 border-t border-gray-100 pt-5 text-left">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400">Date</p>
              <p className="text-xs font-semibold text-gray-700 sm:text-sm">{dateText}</p>
            </div>
            <div className="text-center">
              <p className="border-b border-gray-300 pb-1 font-display text-sm italic text-gray-700 sm:text-base">
                {instructorName}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-400">Instructor</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-gray-400">Length</p>
              <p className="text-xs font-semibold text-gray-700 sm:text-sm">
                {lectureCount} {lectureCount === 1 ? "lecture" : "lectures"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
