export default function AuthProductPreview() {
  return (
    <aside
      aria-label="KeenVPN application preview"
      className="relative hidden min-h-[100dvh] items-center justify-center overflow-hidden bg-[#e9e1d2] px-8 py-14 lg:flex xl:px-12"
    >
      <img
        src="/keenvpn-app-preview.png"
        alt="KeenVPN desktop app showing secure server locations"
        width={1024}
        height={1002}
        decoding="async"
        fetchPriority="high"
        draggable={false}
        className="h-auto max-h-[calc(100dvh-7rem)] w-auto max-w-full object-contain drop-shadow-[0_28px_38px_rgba(58,49,34,0.2)]"
        style={{
          // Native asset is 1012px wide. Cap CSS width near half that so the
          // preview stays sharp on common 2x (Retina) displays instead of
          // upscaling. Drop in a ~2024×2120 export and raise this if needed.
          maxWidth: "min(100%, 36rem)",
        }}
      />
    </aside>
  );
}
