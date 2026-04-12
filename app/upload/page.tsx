import { UploadForm } from "@/components/upload-form";

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted">
          Upload
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          Aggiungi un nuovo audio
        </h1>
        <p className="text-sm text-muted">
          Formati supportati: MP3, M4A, WAV.
        </p>
      </div>

      <UploadForm />
    </div>
  );
}
