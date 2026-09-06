"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Shield,
  CheckCircle,
  XCircle,
  KeyRound,
  UserCheck,
  UserX,
  History,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import {
  adminCreateUserAction,
  listUsersAction,
  toggleUserActiveAction,
  resetPasswordAction,
} from "@/auth/actions";
import { getAuditLogsAction } from "@/actions/audit";
import { AuditLogClient } from "@/components/audit/audit-log-client";
import type { ChangeLog } from "@/db/schema/audit";

interface UserItem {
  id: string;
  loginId: string;
  name: string;
  email: string;
  role: "ADMIN" | "ACCOUNTANT" | "USER";
  contactId?: string | null;
  active: boolean;
  createdAt: string;
}

function AdminUsersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams.get("tab") === "audit" ? "audit" : "users";

  const [activeTab, setActiveTab] = useState<"users" | "audit">(initialTab);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState<UserItem | null>(null);

  // Audit state
  const [auditLogs, setAuditLogs] = useState<ChangeLog[]>([]);
  const [auditStats, setAuditStats] = useState<{
    totalLogs: number;
    todayCount: number;
    entityCounts: Record<string, number>;
  }>({ totalLogs: 0, todayCount: 0, entityCounts: {} });
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Form state for creating user
  const [newForm, setNewForm] = useState({
    loginId: "",
    name: "",
    email: "",
    password: "",
    role: "USER" as "ADMIN" | "ACCOUNTANT" | "USER",
  });
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  // Form state for reset password
  const [resetPass, setResetPass] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  const [currentUserRole, setCurrentUserRole] = useState<string>("ADMIN");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUserRole(data.user.role);
        }
      })
      .catch(() => {});
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await listUsersAction();
      if (res.success && res.users) {
        setUsers(res.users as unknown as UserItem[]);
      }
    } catch (err) {
      console.warn("[User Management] Could not load users:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const res = await getAuditLogsAction();
      if (res.success && res.logs) {
        setAuditLogs(res.logs as ChangeLog[]);
        setAuditStats(res.stats);
      }
    } catch (err) {
      console.warn("[User Management] Could not load audit logs:", err);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadAuditLogs();
  }, []);

  // Sync tab with URL if user toggles
  const handleTabChange = (tab: "users" | "audit") => {
    setActiveTab(tab);
    if (tab === "audit") {
      loadAuditLogs();
    }
    const currentUrl = new URL(window.location.href);
    if (tab === "audit") {
      currentUrl.searchParams.set("tab", "audit");
    } else {
      currentUrl.searchParams.delete("tab");
    }
    window.history.replaceState(null, "", currentUrl.pathname + currentUrl.search);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");

    const res = await adminCreateUserAction({
      ...newForm,
      confirmPassword: newForm.password,
    });
    if (!res.success) {
      setCreateError(res.error || "Failed to create user");
      return;
    }

    setCreateSuccess("User created successfully!");
    setNewForm({
      loginId: "",
      name: "",
      email: "",
      password: "",
      role: "USER",
    });
    setTimeout(() => {
      setShowCreateModal(false);
      setCreateSuccess("");
      loadUsers();
      loadAuditLogs();
    }, 1200);
  };

  const handleToggleActive = async (user: UserItem) => {
    const res = await toggleUserActiveAction(user.id, !user.active);
    if (res.success) {
      loadUsers();
      loadAuditLogs();
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResetModal) return;
    setResetError("");
    setResetSuccess("");

    const res = await resetPasswordAction({
      loginId: showResetModal.loginId,
      email: showResetModal.email,
      newPassword: resetPass,
      confirmNewPassword: resetPass,
    });

    if (!res.success) {
      setResetError(res.error || "Failed to reset password");
      return;
    }

    setResetSuccess("Password updated successfully!");
    setResetPass("");
    setTimeout(() => {
      setShowResetModal(null);
      setResetSuccess("");
      loadAuditLogs();
    }, 1200);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950 text-purple-300 border border-purple-800/60">
            ADMIN
          </span>
        );
      case "ACCOUNTANT":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950 text-blue-300 border border-blue-800/60">
            ACCOUNTANT
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            USER
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="h-6 w-6 text-amber-500" /> User Management &amp; Access Control
          </h1>
          <p className="text-slate-400 text-sm">
            Manage system users, credentials, role-based access, and immutable security audit logs.
          </p>
        </div>
        {activeTab === "users" && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-md transition-colors"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Add User
          </button>
        )}
      </div>

      {/* Tabs Switcher: Users vs Audit Trail */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => handleTabChange("users")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "users"
              ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users &amp; Credentials</span>
          <span
            className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
              activeTab === "users"
                ? "bg-amber-600/70 text-slate-950 font-bold"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {users.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange("audit")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "audit"
              ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Trail &amp; Activity Logs</span>
          <span
            className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
              activeTab === "audit"
                ? "bg-amber-600/70 text-slate-950 font-bold"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {auditStats.totalLogs}
          </span>
        </button>
      </div>

      {/* Tab 1: Users & Credentials */}
      {activeTab === "users" && (
        <>
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <p className="text-xs text-slate-400">Loading system users…</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/90 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Login ID</th>
                      <th className="py-3.5 px-4">Full Name</th>
                      <th className="py-3.5 px-4">Email</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-slate-200">
                          {u.loginId}
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-medium">{u.name}</td>
                        <td className="py-3 px-4 text-slate-400">{u.email}</td>
                        <td className="py-3 px-4">{getRoleBadge(u.role)}</td>
                        <td className="py-3 px-4">
                          {u.active ? (
                            <span className="inline-flex items-center text-xs font-semibold text-emerald-400">
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs font-semibold text-rose-400">
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => setShowResetModal(u)}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-750 hover:text-white border border-slate-700 transition-colors"
                            title="Reset Password"
                          >
                            <KeyRound className="w-3.5 h-3.5 mr-1 text-amber-400" /> Reset
                          </button>
                          <button
                            onClick={() => handleToggleActive(u)}
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                              u.active
                                ? "text-rose-300 bg-rose-950/40 border-rose-900/60 hover:bg-rose-900/40"
                                : "text-emerald-300 bg-emerald-950/40 border-emerald-900/60 hover:bg-emerald-900/40"
                            }`}
                            title={u.active ? "Deactivate User" : "Activate User"}
                          >
                            {u.active ? (
                              <>
                                <UserX className="w-3.5 h-3.5 mr-1" /> Deactivate
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5 mr-1" /> Activate
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-500 text-sm">
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tab 2: Audit Trail & Activity Logs */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          {loadingAudit ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <p className="text-xs text-slate-400">Loading system audit trail…</p>
            </div>
          ) : (
            <AuditLogClient initialLogs={auditLogs} stats={auditStats} />
          )}
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-500" /> Create System User
            </h2>

            {createError && (
              <div className="p-3 mb-4 text-xs bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl">
                {createError}
              </div>
            )}
            {createSuccess && (
              <div className="p-3 mb-4 text-xs bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl">
                {createSuccess}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Login ID / Username
                </label>
                <input
                  type="text"
                  required
                  value={newForm.loginId}
                  onChange={(e) => setNewForm({ ...newForm, loginId: e.target.value })}
                  placeholder="e.g. john_doe"
                  className="w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newForm.name}
                  onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newForm.email}
                  onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
                  placeholder="john@urbanfurniture.com"
                  className="w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newForm.password}
                  onChange={(e) => setNewForm({ ...newForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Role</label>
                <select
                  value={newForm.role}
                  onChange={(e) =>
                    setNewForm({
                      ...newForm,
                      role: e.target.value as "ADMIN" | "ACCOUNTANT" | "USER",
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="USER">USER (Customer Portal)</option>
                  <option value="ACCOUNTANT">ACCOUNTANT (Financials, Vouchers, Reports)</option>
                  <option value="ADMIN">ADMIN (Full System Control)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 transition-colors text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-slate-950 bg-amber-500 hover:bg-amber-400 transition-colors text-xs font-semibold shadow-md"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-500" /> Reset Password
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Updating password for user:{" "}
              <span className="font-mono text-slate-200 font-semibold">
                {showResetModal.loginId}
              </span>
            </p>

            {resetError && (
              <div className="p-3 mb-4 text-xs bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl">
                {resetError}
              </div>
            )}
            {resetSuccess && (
              <div className="p-3 mb-4 text-xs bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl">
                {resetSuccess}
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={resetPass}
                  onChange={(e) => setResetPass(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResetModal(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 transition-colors text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-slate-950 bg-amber-500 hover:bg-amber-400 transition-colors text-xs font-semibold shadow-md"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-xs text-slate-400">Loading User Management…</p>
        </div>
      }
    >
      <AdminUsersContent />
    </Suspense>
  );
}
