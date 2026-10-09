import React, { useState, useRef, useEffect } from "react";
import {
  LogIn,
  LogOut,
  ChevronDown,
  Shield,
  Store,
  ShoppingBag,
  Eye,
  Edit2,
  Check,
  AlertCircle,
  X,
} from "lucide-react";
import { AuthProfile } from "../services/types";
import { updateMyProfile } from "../services/api";

interface UserMenuDropdownProps {
  currentProfile: AuthProfile | null;
  isAuthenticated: boolean;
  onSignIn: () => void;
  onSignOut?: () => void;
  onOpenUserManagement?: () => void;
  onQuickSwitch?: (
    role: "guest" | "customer" | "vendor" | "admin",
    vendorId?: string,
  ) => void;
  onRestoreOriginal?: () => void;
  hasOriginalSession?: boolean;
  hasPermission?: (perm: string) => boolean;
  onProfileUpdated?: (profile: AuthProfile) => void;
}

export const UserMenuDropdown: React.FC<UserMenuDropdownProps> = ({
  currentProfile,
  isAuthenticated,
  onSignIn,
  onSignOut,
  onOpenUserManagement,
  onQuickSwitch,
  hasPermission,
  onProfileUpdated,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileUsername, setProfileUsername] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Determine active and root roles accurately
  const activeRole: "guest" | "customer" | "vendor" | "admin" =
    (currentProfile?.role as any) || "guest";
  const originalRole: "guest" | "customer" | "vendor" | "admin" =
    (currentProfile?.originalRole as any) || activeRole;

  // Has persistent account credentials / root identity
  const hasRootAccount =
    originalRole === "admin" ||
    originalRole === "vendor" ||
    originalRole === "customer";
  const isViewingAsGuest = activeRole === "guest";
  const isTrulyAnonymous =
    !currentProfile || (!hasRootAccount && isViewingAsGuest);

  // The role that dictates permissions and role switching capability
  const rootRole: "guest" | "customer" | "vendor" | "admin" = hasRootAccount
    ? originalRole
    : activeRole;

  const name =
    !isTrulyAnonymous && currentProfile?.name && !isViewingAsGuest
      ? currentProfile.name
      : isViewingAsGuest
        ? "Guest"
        : "Guest Visitor";

  const initials =
    !isTrulyAnonymous && currentProfile?.name
      ? currentProfile.name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "G";

  const getRoleColor = (r: string) => {
    switch (r) {
      case "admin":
        return { bg: "#ecfdf5", text: "#059669", border: "#a7f3d0" };
      case "vendor":
        return { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe" };
      case "customer":
        return { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" };
      default:
        return { bg: "#f1f5f9", text: "#64748b", border: "#e2e8f0" };
    }
  };

  const activeRoleColor = getRoleColor(activeRole);
  const rootRoleColor = getRoleColor(rootRole);

  const getRoleLabel = (r: string) => {
    switch (r) {
      case "admin":
        return "Super-Admin";
      case "vendor":
        return "Vendor";
      case "customer":
        return "Customer";
      default:
        return "Guest";
    }
  };

  const getAllowedRoles = (
    r: string,
  ): Array<"guest" | "customer" | "vendor" | "admin"> => {
    switch (r) {
      case "admin":
        return ["admin", "vendor", "customer", "guest"];
      case "vendor":
        return ["vendor", "customer", "guest"];
      case "customer":
        return ["customer", "guest"];
      default:
        return ["guest"];
    }
  };

  const allowedRoles = getAllowedRoles(rootRole);

  const quickSwitchItems: {
    role: "guest" | "customer" | "vendor" | "admin";
    icon: React.ReactNode;
    label: string;
    desc: string;
  }[] = [
    {
      role: "admin",
      icon: <Shield size={14} />,
      label: "Platform Admin",
      desc: "Full root access (*)",
    },
    {
      role: "vendor",
      icon: <Store size={14} />,
      label: "Vendor",
      desc: "Storefront inventory & fulfillment",
    },
    {
      role: "customer",
      icon: <ShoppingBag size={14} />,
      label: "Customer",
      desc: "Browse & checkout",
    },
    {
      role: "guest",
      icon: <Eye size={14} />,
      label: "Guest",
      desc: "Browse only (anonymous view)",
    },
  ];

  const switchableItems = quickSwitchItems.filter((item) =>
    allowedRoles.includes(item.role),
  );

  const handleStartEditProfile = () => {
    setProfileUsername(currentProfile?.username || "");
    setProfileName(currentProfile?.name || "");
    setProfileEmail(currentProfile?.email || "");
    setProfileError(null);
    setProfileSuccess(null);
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProfile) return;
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const res = await updateMyProfile({
        username: profileUsername.trim(),
        name: profileName.trim(),
        email: profileEmail.trim(),
      });
      if (res.success) {
        setProfileSuccess("Profile updated successfully!");
        if (onProfileUpdated) {
          onProfileUpdated({
            ...currentProfile,
            username: profileUsername.trim() || currentProfile.username,
            name: profileName.trim() || currentProfile.name,
            email: profileEmail.trim() || currentProfile.email,
          });
        }
        setTimeout(() => {
          setIsEditingProfile(false);
          setProfileSuccess(null);
        }, 900);
      } else {
        setProfileError(res.error || "Failed to update profile");
      }
    } catch (err: any) {
      setProfileError(err.message || "Error updating profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User Account Menu"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "#ffffff",
          border: "1.5px solid #e2e8f0",
          borderRadius: "10px",
          padding: "0.35rem 0.65rem 0.35rem 0.4rem",
          cursor: "pointer",
          transition: "all 0.15s ease",
          boxShadow: isOpen
            ? "0 0 0 3px rgba(99, 102, 241, 0.1)"
            : "0 1px 2px rgba(0,0,0,0.04)",
          outline: "none",
        }}
        onMouseEnter={(e) => {
          if (!isOpen)
            (e.currentTarget as HTMLElement).style.borderColor = "#cbd5e1";
        }}
        onMouseLeave={(e) => {
          if (!isOpen)
            (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0";
        }}
      >
        {/* Avatar Circle */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: !isTrulyAnonymous
              ? `linear-gradient(135deg, ${activeRoleColor.bg}, ${activeRoleColor.border})`
              : "#f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.65rem",
            fontWeight: 800,
            color: !isTrulyAnonymous ? activeRoleColor.text : "#64748b",
            letterSpacing: "0.03em",
            flexShrink: 0,
          }}
        >
          {initials}
        </div>

        {/* Name & Role */}
        <div style={{ textAlign: "left", lineHeight: 1.2 }}>
          <div
            style={{
              fontSize: "0.8rem",
              fontWeight: 650,
              color: "#0f172a",
              whiteSpace: "nowrap",
            }}
          >
            {!isTrulyAnonymous
              ? name.length > 16
                ? name.slice(0, 16) + "…"
                : name
              : "Guest"}
          </div>
          <div
            style={{
              fontSize: "0.65rem",
              color: !isTrulyAnonymous ? activeRoleColor.text : "#94a3b8",
              fontWeight: 600,
            }}
          >
            {isViewingAsGuest
              ? "Guest"
              : !isTrulyAnonymous
                ? getRoleLabel(activeRole)
                : "Browse Mode"}
          </div>
        </div>

        {/* Chevron */}
        <ChevronDown
          size={14}
          color="#94a3b8"
          style={{
            transition: "transform 0.2s ease",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 300,
            background: "#ffffff",
            borderRadius: 14,
            border: "1px solid #e2e8f0",
            boxShadow:
              "0 12px 32px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.05)",
            zIndex: 999,
            overflow: "hidden",
            animation: "dropdownFadeIn 0.15s ease-out",
          }}
        >
          <>
            {/* Profile Section */}
            <div style={{ padding: "1rem", borderBottom: "1px solid #f1f5f9" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${activeRoleColor.bg}, ${activeRoleColor.border})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    color: activeRoleColor.text,
                  }}
                >
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "0.875rem",
                      color: "#0f172a",
                    }}
                  >
                    {!isTrulyAnonymous
                      ? currentProfile?.name || name
                      : "Guest Visitor"}
                  </div>

                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    {!isTrulyAnonymous
                      ? currentProfile?.email
                      : "Catalog & Browsing Session"}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: activeRoleColor.bg,
                    color: activeRoleColor.text,
                    border: `1px solid ${activeRoleColor.border}`,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {getRoleLabel(activeRole)}
                </span>
              </div>

              {/* Vendor Storefront Indicator - only for native vendor accounts */}
              {activeRole === "vendor" &&
                rootRole !== "admin" &&
                currentProfile?.vendorId && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "5px 8px",
                      borderRadius: 6,
                      background: "#f5f3ff",
                      border: "1px solid #ddd6fe",
                      fontSize: "0.725rem",
                      color: "#6d28d9",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Store size={12} />
                    <span>
                      Storefront: <strong>{currentProfile.vendorId}</strong>
                    </span>
                  </div>
                )}
            </div>

            {/* Switch Role Section (For users with privileges) */}
            {!isTrulyAnonymous && switchableItems.length > 1 && (
              <div style={{ padding: "0.5rem" }}>
                <div
                  style={{
                    fontSize: "0.675rem",
                    fontWeight: 700,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    padding: "0.25rem 0.5rem 0.35rem",
                  }}
                >
                  Switch View / Role
                </div>
                {switchableItems.map((item) => {
                  const isActive = activeRole === item.role;
                  return (
                    <button
                      key={item.role}
                      onClick={() => {
                        if (!isActive && onQuickSwitch) {
                          onQuickSwitch(item.role);
                          setIsOpen(false);
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                        width: "100%",
                        padding: "0.5rem 0.5rem",
                        border: "none",
                        background: isActive ? "#f8fafc" : "transparent",
                        borderRadius: 8,
                        cursor: isActive ? "default" : "pointer",
                        transition: "background 0.12s ease",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive)
                          (e.currentTarget as HTMLElement).style.background =
                            "#f1f5f9";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          isActive ? "#f8fafc" : "transparent";
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          background: getRoleColor(item.role).bg,
                          color: getRoleColor(item.role).text,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {item.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              color: "#0f172a",
                            }}
                          >
                            {item.label}
                          </span>
                          {isActive && (
                            <span
                              style={{
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                padding: "1px 6px",
                                borderRadius: 4,
                                background: getRoleColor(item.role).bg,
                                color: getRoleColor(item.role).text,
                                border: `1px solid ${getRoleColor(item.role).border}`,
                              }}
                            >
                              Active
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.675rem", color: "#94a3b8" }}>
                          {item.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Divider */}
            <div
              style={{ height: 1, background: "#f1f5f9", margin: "0 0.5rem" }}
            />

            {/* Actions: Sign In (for guests) and Sign Out (for accounts) */}
            <div style={{ padding: "0.5rem" }}>
              {isTrulyAnonymous ? (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onSignIn();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    width: "100%",
                    padding: "0.5rem 0.5rem",
                    border: "none",
                    background: "#eff6ff",
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "background 0.12s ease",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "#dbeafe";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "#eff6ff";
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      background: "#2563eb",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <LogIn size={14} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "#1e40af",
                      }}
                    >
                      Sign In with Credentials
                    </div>
                    <div style={{ fontSize: "0.675rem", color: "#60a5fa" }}>
                      Authenticate with your own username & password
                    </div>
                  </div>
                </button>
              ) : (
                onSignOut && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onSignOut();
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      width: "100%",
                      padding: "0.5rem 0.5rem",
                      border: "none",
                      background: "transparent",
                      borderRadius: 8,
                      cursor: "pointer",
                      transition: "background 0.12s ease",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "#fff1f2";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        background: "#fff1f2",
                        color: "#e11d48",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <LogOut size={14} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          color: "#e11d48",
                        }}
                      >
                        Sign Out
                      </div>
                      <div style={{ fontSize: "0.675rem", color: "#94a3b8" }}>
                        End session and return to guest mode
                      </div>
                    </div>
                  </button>
                )
              )}
            </div>
          </>
        </div>
      )}
    </div>
  );
};

export default UserMenuDropdown;
