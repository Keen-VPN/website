export default function AuthProductPreview() {
  return (
    <aside
      aria-label="KeenVPN application preview"
      className="relative hidden min-h-[100dvh] overflow-hidden bg-[#e9e1d2] lg:block"
    >
      <img
        src="/keenvpn-app-preview.png"
        alt="KeenVPN desktop app connected securely with server locations displayed on a world map"
        width={2174}
        height={1510}
        decoding="async"
        fetchPriority="high"
        draggable={false}
        className="absolute left-[clamp(4rem,8vw,8rem)] top-[12dvh] block h-[76dvh] w-auto max-w-none select-none"
      />
    </aside>
  );
}
