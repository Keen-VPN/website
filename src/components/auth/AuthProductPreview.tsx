export default function AuthProductPreview() {
  return (
    <aside
      aria-label="KeenVPN application preview"
      className="relative hidden min-h-[100dvh] items-center justify-center overflow-hidden bg-[#e9e1d2] px-8 py-14 lg:flex xl:px-12"
    >
      {/*
        Clip the bitmap to a true rounded rect so square dark corners in the
        PNG cannot poke through the frame, then draw a crisp white stripe in CSS.
      */}
      <div
        className="w-auto max-w-full overflow-hidden rounded-[1.75rem] border-[3px] border-white bg-[#0b1220] shadow-[0_28px_38px_rgba(58,49,34,0.22)]"
        style={{ maxWidth: "min(100%, 36rem)" }}
      >
        <img
          src="/keenvpn-app-preview.png"
          alt="KeenVPN desktop app showing secure server locations"
          width={1024}
          height={1002}
          decoding="async"
          fetchPriority="high"
          draggable={false}
          className="block h-auto max-h-[calc(100dvh-7rem)] w-full scale-[1.015]"
        />
      </div>
    </aside>
  );
}
