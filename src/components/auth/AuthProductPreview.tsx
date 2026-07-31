export default function AuthProductPreview() {
  return (
    <aside
      aria-label="KeenVPN application preview"
      className="relative hidden min-h-[100dvh] items-center justify-center overflow-hidden bg-[#e9e1d2] px-8 py-14 lg:flex xl:px-12"
    >
      <div
        role="img"
        aria-label="KeenVPN desktop app showing secure server locations"
        className="aspect-[1012/1060] max-h-[calc(100dvh-7rem)] w-full max-w-[980px] bg-contain bg-center bg-no-repeat drop-shadow-[0_28px_38px_rgba(58,49,34,0.2)]"
        style={{ backgroundImage: "url('/keenvpn-app-preview.png')" }}
      />
    </aside>
  );
}
