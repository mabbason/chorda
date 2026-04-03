import { useState, useCallback } from "react";
import { submitPassphrase } from "../utils/auth";

interface Props {
  onSuccess: () => void;
}

export function PassphraseGate({ onSuccess }: Props) {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!passphrase.trim() || loading) return;
    setLoading(true);
    setError("");

    const result = await submitPassphrase(passphrase);
    setLoading(false);

    if (result.ok) {
      onSuccess();
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      if (result.retryAfterSec) {
        setError(`Too many attempts. Try again in ${result.retryAfterSec}s`);
      } else {
        setError(result.error || "Incorrect passphrase");
      }
    }
  }, [passphrase, loading, onSuccess]);

  return (
    <div className="h-screen bg-slate-900 flex items-center justify-center">
      <div className={`w-full max-w-sm px-6 ${shake ? "animate-shake" : ""}`}>
        <h1 className="text-4xl font-bold text-white text-center mb-2">Chorda</h1>
        <p className="text-slate-500 text-center text-sm mb-8">Enter passphrase to continue</p>

        <input
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Passphrase"
          className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-center focus:outline-none focus:border-cyan-500"
          autoFocus
        />

        {error && (
          <p className="text-red-400 text-sm text-center mt-3">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !passphrase.trim()}
          className="w-full mt-4 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors"
        >
          {loading ? "Verifying..." : "Enter"}
        </button>
      </div>
    </div>
  );
}
