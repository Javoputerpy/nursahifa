import { useEffect, useRef, useState, useCallback } from "react";
import { X, RotateCcw, Camera as CameraIcon, ImagePlus, AlertCircle } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  onFallbackUpload?: () => void;
};

const MAX_LONG_EDGE = 1600;
const JPEG_QUALITY = 0.85;

export function CameraScanner({ open, onClose, onCapture, onFallbackUpload }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async (mode: "environment" | "user") => {
    setError(null);
    setReady(false);
    stop();
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Bu qurilma kamerani qo'llab-quvvatlamaydi.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        setReady(true);
      }
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        setHasMultipleCameras(devs.filter((d) => d.kind === "videoinput").length > 1);
      } catch {}
    } catch (e: any) {
      const name = e?.name || "";
      if (name === "NotAllowedError" || name === "SecurityError")
        setError("Kamerani ochish uchun ruxsat kerak. Brauzer sozlamalaridan ruxsat bering.");
      else if (name === "NotFoundError" || name === "OverconstrainedError")
        setError("Kamera topilmadi. Rasm yuklash orqali davom eting.");
      else setError("Kamerani ochib bo'lmadi. Qayta urinib ko'ring.");
    }
  }, [stop]);

  useEffect(() => {
    if (open) start(facing);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facing]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !ready) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;

    // Crop to central 90% (removes overlay dim edges)
    const cropW = Math.floor(vw * 0.9);
    const cropH = Math.floor(vh * 0.9);
    const sx = Math.floor((vw - cropW) / 2);
    const sy = Math.floor((vh - cropH) / 2);

    // Downscale so long edge <= MAX_LONG_EDGE
    const scale = Math.min(1, MAX_LONG_EDGE / Math.max(cropW, cropH));
    const outW = Math.round(cropW * scale);
    const outH = Math.round(cropH * scale);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, outW, outH);

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    if ("vibrate" in navigator) navigator.vibrate?.(20);
    setFlashing(true);
    setTimeout(() => setFlashing(false), 500);
    stop();
    onCapture(dataUrl);
  }, [ready, stop, onCapture]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black text-white">
      {/* Live preview */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Dim vignette + rounded viewfinder */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute left-1/2 top-1/2 h-[62dvh] w-[86vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
        {/* corner marks */}
        {(["tl","tr","bl","br"] as const).map((k) => (
          <span key={k}
            className={`absolute h-6 w-6 border-[var(--brand-2)] ${
              k==="tl" ? "border-l-[3px] border-t-[3px] rounded-tl-2xl" :
              k==="tr" ? "border-r-[3px] border-t-[3px] rounded-tr-2xl" :
              k==="bl" ? "border-l-[3px] border-b-[3px] rounded-bl-2xl" :
                        "border-r-[3px] border-b-[3px] rounded-br-2xl"
            }`}
            style={{
              left: k.endsWith("l") ? "calc(50vw - min(43vw, 224px))" : undefined,
              right: k.endsWith("r") ? "calc(50vw - min(43vw, 224px))" : undefined,
              top: k.startsWith("t") ? "calc(50dvh - 31dvh)" : undefined,
              bottom: k.startsWith("b") ? "calc(50dvh - 31dvh)" : undefined,
            }}
          />
        ))}
      </div>

      {/* Shutter flash */}
      {flashing && <div className="pointer-events-none absolute inset-0 bg-white animate-shutter" />}

      {/* Top bar */}
      <div
        className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-4"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <button
          onClick={() => { stop(); onClose(); }}
          className="ios-pressable grid h-10 w-10 place-items-center rounded-full bg-black/50 backdrop-blur-xl"
          aria-label="Yopish"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="rounded-full bg-black/50 px-3 py-1.5 text-[11px] font-semibold backdrop-blur-xl">
          Matnni ramka ichiga oling
        </div>
        {hasMultipleCameras ? (
          <button
            onClick={() => setFacing((f) => f === "environment" ? "user" : "environment")}
            className="ios-pressable grid h-10 w-10 place-items-center rounded-full bg-black/50 backdrop-blur-xl"
            aria-label="Kamerani almashtirish"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        ) : <span className="h-10 w-10" />}
      </div>

      {/* Bottom controls */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-around px-8 pb-8"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={onFallbackUpload}
          className="ios-pressable grid h-12 w-12 place-items-center rounded-2xl bg-white/15 backdrop-blur-xl"
          aria-label="Rasm yuklash"
        >
          <ImagePlus className="h-5 w-5" />
        </button>

        <button
          onClick={capture}
          disabled={!ready}
          className="ios-pressable grid h-20 w-20 place-items-center rounded-full bg-white/10 ring-4 ring-white/90 disabled:opacity-50"
          aria-label="Rasmga olish"
        >
          <span className="h-16 w-16 rounded-full bg-white" />
        </button>

        <span className="h-12 w-12" />
      </div>

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center px-6 bg-black/80 backdrop-blur-xl">
          <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-white/5 p-6 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-500/20">
              <AlertCircle className="h-6 w-6 text-red-300" />
            </div>
            <p className="mt-3 text-sm text-white/90">{error}</p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => start(facing)}
                className="ios-pressable flex-1 rounded-full border border-white/20 bg-white/10 py-2.5 text-sm font-semibold"
              >
                Qayta urinish
              </button>
              {onFallbackUpload && (
                <button
                  onClick={onFallbackUpload}
                  className="ios-pressable flex-1 rounded-full bg-gradient-brand py-2.5 text-sm font-semibold text-white shadow-glow"
                >
                  <span className="inline-flex items-center gap-1.5 justify-center">
                    <CameraIcon className="h-4 w-4" /> Rasm yuklash
                  </span>
                </button>
              )}
            </div>
            <button
              onClick={() => { stop(); onClose(); }}
              className="mt-3 w-full text-xs text-white/60 hover:text-white/90"
            >
              Yopish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
