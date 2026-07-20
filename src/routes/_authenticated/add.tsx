import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateWordData } from "@/lib/ai.functions";
import { extractWordsFromImageOCR, generateFromWordList } from "@/lib/ocr.functions";
import { useDailyScanLimit } from "@/hooks/useDailyLimit";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CameraScanner } from "@/components/CameraScanner";
import { toast } from "sonner";
import {
  Loader2, Sparkles, ArrowRight, Camera, ImagePlus, X, FileText,
  ScanLine, Wand2, CheckCircle2, Trash2, Plus, Check,
  AlertTriangle, Zap,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/add")({
  head: () => ({ meta: [{ title: "So'z qo'shish — VocabFlow" }] }),
  component: AddPage,
});

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

type Stage = "idle" | "scanning" | "extracted" | "review" | "generating" | "done";

function AddPage() {
  const navigate = useNavigate();
  const generate = useServerFn(generateWordData);
  const ocrExtract = useServerFn(extractWordsFromImageOCR);
  const ocrGenerate = useServerFn(generateFromWordList);
  const { count, limit, remaining, loading: limitLoading, exceeded, refresh, increment, canScan } = useDailyScanLimit();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [stage, setStage] = useState<Stage>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [reviewWords, setReviewWords] = useState<{ word: string; selected: boolean }[]>([]);
  const [newWord, setNewWord] = useState("");
  const [foundCount, setFoundCount] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => { refresh(); }, [refresh]);

  const resetOcr = () => {
    setStage("idle");
    setPreview(null);
    setReviewWords([]);
    setNewWord("");
    setFoundCount(0);
  };

  const runOcrPipeline = async (dataUrl: string) => {
    // Check scan limit before starting
    await refresh();
    if (!canScan) {
      setShowLimitModal(true);
      return;
    }

    try {
      setPreview(dataUrl);
      setStage("scanning");

      // Increment count first (optimistic)
      await increment();

      const res = await ocrExtract({ data: { imageDataUrl: dataUrl } });
      setFoundCount(res.words.length);
      setReviewWords(res.words.map((w) => ({ word: w, selected: true })));
      setStage("extracted");
      if (res.cached) {
        toast.success(`${res.words.length} ta so'z topildi (keshdan)`);
      } else {
        toast.success(`${res.words.length} ta so'z topildi!`);
      }
      setTimeout(() => setStage("review"), 900);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.startsWith("LIMIT:")) {
        setShowLimitModal(true);
        resetOcr();
      } else {
        toast.error(msg || "Rasmni skanerlab bo'lmadi. Qayta urinib ko'ring.");
        resetOcr();
      }
    }
  };

  const handleImage = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 6_000_000) return toast.error("Rasm 6MB dan kichik bo'lsin");
    const dataUrl = await fileToDataUrl(file);
    await runOcrPipeline(dataUrl);
  };

  const toggleWord = (i: number) =>
    setReviewWords((prev) => prev.map((w, idx) => (idx === i ? { ...w, selected: !w.selected } : w)));

  const editWord = (i: number, value: string) =>
    setReviewWords((prev) => prev.map((w, idx) => (idx === i ? { ...w, word: value } : w)));

  const deleteWord = (i: number) =>
    setReviewWords((prev) => prev.filter((_, idx) => idx !== i));

  const addManualWord = () => {
    const w = newWord.trim().toLowerCase();
    if (!w) return;
    if (reviewWords.some((r) => r.word === w)) {
      toast.error("Bu so'z allaqachon bor");
      return;
    }
    setReviewWords((prev) => [...prev, { word: w, selected: true }]);
    setNewWord("");
  };

  const confirmAndGenerate = async () => {
    const selected = reviewWords.filter((r) => r.selected).map((r) => r.word.trim()).filter(Boolean);
    if (selected.length === 0) return toast.error("Kamida bitta so'zni tanlang");
    try {
      setStage("generating");
      const res = await ocrGenerate({ data: { words: selected } });
      setStage("done");
      if (res.inserted > 0) {
        toast.success(
          `${res.inserted} ta kartochka yaratildi` +
          (res.skipped ? ` · ${res.skipped} ta takror o'tkazib yuborildi` : "")
        );
      } else {
        toast.info("Bu so'zlar allaqachon ro'yxatingizda bor");
      }
      refresh();
      setTimeout(() => {
        resetOcr();
        navigate({ to: "/feed" });
      }, 700);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kartochkalarni yaratib bo'lmadi");
      setStage("review");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const words = input.split(/[\n,]+/).map((w) => w.trim()).filter(Boolean);
    if (words.length === 0) return toast.error("Kamida bitta so'z kiriting");
    setLoading(true);
    try {
      const res = await generate({ data: { words } });
      toast.success(`${res.inserted} ta so'z qo'shildi`);
      setInput("");
      navigate({ to: "/feed" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "So'zlarni qo'shib bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  // ---------- Full-screen OCR overlay states ----------
  if (stage === "scanning" || stage === "extracted" || stage === "generating" || stage === "done") {
    return <OcrProgressOverlay stage={stage} preview={preview} foundCount={foundCount} />;
  }

  if (stage === "review") {
    return (
      <ReviewScreen
        preview={preview}
        words={reviewWords}
        newWord={newWord}
        setNewWord={setNewWord}
        onAdd={addManualWord}
        onToggle={toggleWord}
        onEdit={editWord}
        onDelete={deleteWord}
        onCancel={resetOcr}
        onConfirm={confirmAndGenerate}
      />
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-72px)] max-w-md flex-col px-5 pt-5 pb-3 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-brand shadow-glow">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-tight">So'z qo'shish</h1>
            <p className="text-[11px] text-muted-foreground">AI siz uchun hammasini to'ldiradi.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/text"
            className="flex items-center gap-1.5 rounded-full border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-3 py-1.5 text-[10px] font-bold text-[#D4AF37] active:scale-95 transition"
          >
            <FileText className="h-3 w-3" /> Matn
          </Link>
          <ThemeToggle />
        </div>
      </div>

      {/* Daily limit indicator */}
      <div className="mt-3 shrink-0">
        <div className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-[11px] font-medium backdrop-blur-xl ${
          exceeded
            ? "border-red-400/40 bg-red-500/10 text-red-300"
            : remaining <= 1
              ? "border-amber-400/40 bg-amber-500/10 text-amber-300"
              : "border-white/15 bg-white/[0.06] text-muted-foreground"
        }`}>
          <div className="flex items-center gap-1.5">
            <Zap className="h-3 w-3" />
            <span>Kunlik skanerlash</span>
          </div>
          <div className="flex items-center gap-1">
            {limitLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <span className={`font-bold ${exceeded ? "text-red-300" : remaining <= 1 ? "text-amber-300" : "text-foreground"}`}>
                  {remaining}
                </span>
                <span>/ {limit}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <input
        ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => handleImage(e.target.files?.[0])}
      />
      <input
        ref={galleryRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => handleImage(e.target.files?.[0])}
      />

      <div className="mt-3 grid grid-cols-2 gap-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            if (!canScan) { setShowLimitModal(true); return; }
            setScannerOpen(true);
          }}
          disabled={!canScan}
          className="ios-pressable flex items-center justify-center gap-2 rounded-2xl border border-[var(--brand-2)]/40 bg-[var(--brand-2)]/10 px-3 py-2.5 text-xs font-semibold text-[var(--brand-2)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Camera className="h-4 w-4" /> Kamera bilan skanlash
        </button>
        <button
          type="button"
          onClick={() => {
            if (!canScan) { setShowLimitModal(true); return; }
            galleryRef.current?.click();
          }}
          disabled={!canScan}
          className="ios-pressable flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ImagePlus className="h-4 w-4" /> Rasm yuklash
        </button>
      </div>

      <CameraScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onCapture={async (dataUrl) => {
          setScannerOpen(false);
          await runOcrPipeline(dataUrl);
        }}
        onFallbackUpload={() => { setScannerOpen(false); galleryRef.current?.click(); }}
      />


      <form onSubmit={submit} className="mt-3 flex flex-1 min-h-0 flex-col gap-2">
        <div className="flex-1 min-h-0 rounded-3xl border border-border bg-card p-2 shadow-soft">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"serendipity\nephemeral\nresilient\n\n(har qatorga bittadan yoki vergul bilan)"}
            className="h-full w-full resize-none rounded-2xl bg-transparent p-3 text-sm outline-none placeholder:text-muted-foreground"
            maxLength={1000}
          />
        </div>

        <p className="text-[10px] text-muted-foreground px-1 shrink-0">
          Maslahat: bir vaqtda 25 tagacha so'z qo'shing.
        </p>

        <button
          type="submit" disabled={loading || !input.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand py-3 text-sm font-semibold text-white shadow-glow transition active:scale-95 disabled:opacity-60 shrink-0"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Tayyorlanmoqda…</>
          ) : (
            <>Kartochka yaratish <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </form>

      {/* Limit exceeded modal */}
      {showLimitModal && (
        <LimitExceededModal
          count={count}
          limit={limit}
          onClose={() => setShowLimitModal(false)}
        />
      )}
    </div>
  );
}

// ============ Limit Exceeded Modal ============
function LimitExceededModal({ count, limit, onClose }: { count: number; limit: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6 bg-black/70 backdrop-blur-xl">
      <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-[#1a1528] p-6 text-center shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-500/20">
          <AlertTriangle className="h-7 w-7 text-amber-300" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-white">Kunlik limit tugadi</h2>
        <p className="mt-2 text-sm text-white/60">
          Bugun <span className="font-bold text-amber-300">{count}</span> / {limit} ta rasm skanerladingiz.
          <br />
          Ertaga qaytadan urinib ko'ring!
        </p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] text-white/50">
            <span className="font-semibold text-white/70">Maslahat:</span> Matn orqali so'z qo'shish — cheksiz!
          </p>
        </div>
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[oklch(0.85_0.18_85)] to-[oklch(0.68_0.14_75)] py-3 text-sm font-bold text-[oklch(0.15_0.05_260)] shadow-[0_10px_30px_-10px_oklch(0.82_0.16_85_/_0.7)] active:scale-[0.98]"
        >
          Tushundim
        </button>
      </div>
    </div>
  );
}

// ============ Progress Overlay ============
function OcrProgressOverlay({
  stage, preview, foundCount,
}: { stage: Stage; preview: string | null; foundCount: number }) {
  const steps = [
    { key: "scanning", icon: ScanLine, label: "Rasm skanerlanmoqda…", sub: "OCR matnni o'qiyapti" },
    { key: "extracted", icon: CheckCircle2, label: `${foundCount} ta so'z topildi!`, sub: "Ko'rib chiqishga tayyorlanmoqda" },
    { key: "generating", icon: Wand2, label: "Kartochka yaratilmoqda…", sub: "AI tarjima va misollarni tuzmoqda" },
    { key: "done", icon: Check, label: "Tayyor!", sub: "Lentaga yo'naltirilmoqda" },
  ] as const;

  const activeIdx = steps.findIndex((s) => s.key === stage);
  const Active = steps[activeIdx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-background/80 backdrop-blur-2xl">
      <div className="w-full max-w-sm rounded-3xl border border-border/60 bg-card/70 backdrop-blur-xl p-6 shadow-glow">
        {preview && (
          <div className="relative mx-auto mb-5 h-32 w-32 overflow-hidden rounded-2xl border border-border/60">
            <img src={preview} alt="" className="h-full w-full object-cover" />
            {(stage === "scanning") && (
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#D4AF37]/30 to-transparent animate-[scanline_1.8s_linear_infinite]" />
            )}
            {stage === "done" && (
              <div className="absolute inset-0 grid place-items-center bg-black/40">
                <Check className="h-10 w-10 text-[#D4AF37]" />
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col items-center text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-brand shadow-glow mb-3">
            {stage === "done" ? (
              <Check className="h-6 w-6 text-white" />
            ) : (
              <Active.icon className="h-6 w-6 text-white animate-pulse" />
            )}
          </div>
          <h2 className="text-lg font-bold tracking-tight">{Active.label}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{Active.sub}</p>

          {stage !== "done" && (
            <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#D4AF37]" />
              Iltimos kuting…
            </div>
          )}

          <div className="mt-5 flex w-full items-center justify-between gap-2">
            {steps.map((s, i) => (
              <div key={s.key} className="flex-1">
                <div
                  className={`h-1 rounded-full transition-all duration-500 ${
                    i <= activeIdx ? "bg-gradient-brand" : "bg-muted"
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}</style>
    </div>
  );
}

// ============ Review Screen ============
function ReviewScreen({
  preview, words, newWord, setNewWord, onAdd, onToggle, onEdit, onDelete, onCancel, onConfirm,
}: {
  preview: string | null;
  words: { word: string; selected: boolean }[];
  newWord: string;
  setNewWord: (v: string) => void;
  onAdd: () => void;
  onToggle: (i: number) => void;
  onEdit: (i: number, v: string) => void;
  onDelete: (i: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const selectedCount = words.filter((w) => w.selected).length;

  return (
    <div className="mx-auto flex h-[calc(100dvh-72px)] max-w-md flex-col px-5 pt-5 pb-3 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight">So'zlarni ko'rib chiqing</h1>
          <p className="text-[11px] text-muted-foreground">Tahrirlang, o'chiring yoki qo'shing.</p>
        </div>
        <button
          onClick={onCancel}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/70 backdrop-blur active:scale-95 transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {preview && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl p-2 shrink-0">
          <img src={preview} alt="" className="h-12 w-12 rounded-xl object-cover" />
          <div className="text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">{selectedCount}</span> / {words.length} tanlangan
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2 shrink-0">
        <input
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onAdd())}
          placeholder="Yangi so'z qo'shish…"
          className="flex-1 rounded-2xl border border-border bg-card/70 backdrop-blur-xl px-4 py-2.5 text-sm outline-none focus:border-[#D4AF37]/60 transition"
        />
        <button
          onClick={onAdd}
          className="grid h-11 w-11 place-items-center rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-[#D4AF37] active:scale-95 transition"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex-1 min-h-0 overflow-y-auto rounded-3xl border border-border/60 bg-card/40 backdrop-blur-xl p-2">
        {words.length === 0 ? (
          <div className="grid h-full place-items-center text-xs text-muted-foreground">
            Hech qanday so'z yo'q
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {words.map((w, i) => (
              <li
                key={i}
                className={`flex items-center gap-2 rounded-2xl border px-2.5 py-2 transition-all ${
                  w.selected
                    ? "border-[#D4AF37]/50 bg-[#D4AF37]/10"
                    : "border-border/50 bg-background/40 opacity-60"
                }`}
              >
                <button
                  onClick={() => onToggle(i)}
                  className={`grid h-6 w-6 place-items-center rounded-md border transition ${
                    w.selected
                      ? "bg-[#D4AF37] border-[#D4AF37] text-[#0A1128]"
                      : "border-border bg-transparent"
                  }`}
                >
                  {w.selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </button>
                <input
                  value={w.word}
                  onChange={(e) => onEdit(i, e.target.value)}
                  className="flex-1 bg-transparent text-sm font-medium outline-none"
                />
                <button
                  onClick={() => onDelete(i)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:text-destructive active:scale-95 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={onConfirm}
        disabled={selectedCount === 0}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-brand py-3 text-sm font-semibold text-white shadow-glow transition active:scale-95 disabled:opacity-60 shrink-0"
      >
        <Sparkles className="h-4 w-4" />
        {selectedCount} ta kartochka yaratish
      </button>
    </div>
  );
}
