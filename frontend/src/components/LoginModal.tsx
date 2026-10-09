import React, { useState, useEffect } from "react";
import {
  Key,
  User,
  Shield,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  ArrowRight,
  LogIn,
} from "lucide-react";
import { loginWithCredentials, startGuestSession } from "../services/api";
import { AuthProfile } from "../services/types";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (profile: AuthProfile) => void;
  onGuestBrowse?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onGuestBrowse,
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please provide both username and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await loginWithCredentials(username.trim(), password.trim());
      if (res.success && res.data) {
        onLoginSuccess(res.data);
        onClose();
      } else {
        setError(
          res.error || "Authentication failed. Please check your credentials.",
        );
      }
    } catch (err: any) {
      setError(err.message || "Login network error");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestBrowse = async () => {
    setLoading(true);
    setError(null);
    try {
      if (onGuestBrowse) {
        onGuestBrowse();
      } else {
        const guestRes = await startGuestSession();
        if (guestRes.success && guestRes.data) {
          onLoginSuccess(guestRes.data);
        }
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Could not start guest session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: 440,
          width: "100%",
          background: "#ffffff",
          borderRadius: 18,
          padding: "2rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          position: "relative",
          border: "1px solid #e2e8f0",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                border: "1px solid #bfdbfe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2563eb",
              }}
            >
              <Shield size={24} />
            </div>
            <div>
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  margin: 0,
                  color: "var(--text-primary)",
                }}
              >
                Sign In to Aura
              </h3>
              <p
                style={{
                  margin: "2px 0 0 0",
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                }}
              >
                Multi-Vendor Marketplace & IAM Platform
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#64748b",
              cursor: "pointer",
              padding: 6,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#f1f5f9";
              (e.currentTarget as HTMLElement).style.color = "#0f172a";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#f8fafc";
              (e.currentTarget as HTMLElement).style.color = "#64748b";
            }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#e11d48",
              fontSize: "0.825rem",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                fontSize: "0.775rem",
                fontWeight: 650,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: 6,
              }}
            >
              Username
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoFocus
                style={{ paddingLeft: 34, fontSize: "0.875rem" }}
              />
              <User
                size={15}
                style={{
                  position: "absolute",
                  left: 11,
                  top: 12,
                  color: "#94a3b8",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label
              style={{
                fontSize: "0.775rem",
                fontWeight: 650,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  paddingLeft: 34,
                  paddingRight: 34,
                  fontSize: "0.875rem",
                }}
              />
              <Key
                size={15}
                style={{
                  position: "absolute",
                  left: 11,
                  top: 12,
                  color: "#94a3b8",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                style={{
                  position: "absolute",
                  right: 10,
                  top: 11,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  padding: 2,
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              fontSize: "0.9rem",
              marginBottom: 14,
            }}
          >
            <LogIn size={15} />
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        {/* Dedicated Guest Browse Section */}
        <div
          style={{
            borderTop: "1px solid #f1f5f9",
            paddingTop: 14,
            textAlign: "center",
          }}
        >
          <button
            type="button"
            onClick={handleGuestBrowse}
            disabled={loading}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "0.65rem 1rem",
              borderRadius: 10,
              background: "#f8fafc",
              border: "1.5px dashed #cbd5e1",
              color: "#475569",
              fontSize: "0.825rem",
              fontWeight: 650,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLElement).style.background = "#f1f5f9";
                (e.currentTarget as HTMLElement).style.borderColor = "#94a3b8";
                (e.currentTarget as HTMLElement).style.color = "#0f172a";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLElement).style.background = "#f8fafc";
                (e.currentTarget as HTMLElement).style.borderColor = "#cbd5e1";
                (e.currentTarget as HTMLElement).style.color = "#475569";
              }
            }}
          >
            <Eye size={15} color="#64748b" />
            <span>Continue as Guest (Browse Only)</span>
            <ArrowRight size={14} color="#94a3b8" />
          </button>
          <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 6 }}>
            Browse catalog, products & search without entering credentials
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
