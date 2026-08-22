export function ClientLogosHeader({ clientLogoUrl }: { clientLogoUrl?: string | null }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/talkpush-logo.jpg" alt="Talkpush" className="h-5 w-auto" />
      {clientLogoUrl && (
        <>
          <span className="text-gray-300" aria-hidden="true">×</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={clientLogoUrl}
            alt=""
            className="h-5 w-auto max-w-[90px] object-contain"
          />
        </>
      )}
    </div>
  )
}
