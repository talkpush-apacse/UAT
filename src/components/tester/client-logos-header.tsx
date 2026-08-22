export function ClientLogosHeader({
  clientLogoUrl,
  className = "mb-1.5",
  logoClassName = "h-5",
}: {
  clientLogoUrl?: string | null
  className?: string
  logoClassName?: string
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/talkpush-logo.jpg" alt="Talkpush" className={`${logoClassName} w-auto`} />
      {clientLogoUrl && (
        <>
          <span className="text-gray-300" aria-hidden="true">×</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={clientLogoUrl}
            alt=""
            className={`${logoClassName} w-auto max-w-[110px] object-contain`}
          />
        </>
      )}
    </div>
  )
}
