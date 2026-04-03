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
    <div className="h-screen bg-n-900 flex items-center justify-center">
      <div className={`w-full max-w-sm px-6 ${shake ? "animate-shake" : ""}`}>
        <div className="flex justify-center mb-2">
          <img src="/logos/chorda-logo-white-full.png" alt="Chorda" className="h-40" />
        </div>
        <p className="text-n-500 text-center text-sm mb-8">Enter passphrase to continue</p>

        <input
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Passphrase"
          className="w-full px-4 py-3 bg-n-800 border border-n-600 rounded-lg text-white placeholder-n-500 text-center focus:outline-none focus:border-purple-light"
          autoFocus
        />

        {error && (
          <p className="text-pink-base text-sm text-center mt-3">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !passphrase.trim()}
          className="w-full mt-4 py-3 bg-purple-base hover:bg-purple-light disabled:bg-n-700 disabled:text-n-500 text-white rounded-lg font-medium transition-colors"
        >
          {loading ? "Verifying..." : "Enter"}
        </button>
      </div>
    </div>
  );
}
