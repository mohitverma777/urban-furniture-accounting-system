"use client";

import React, { useEffect, useState } from "react";
import { Users, UserPlus, Shield, CheckCircle, XCircle, KeyRound, UserCheck, UserX } from "lucide-react";
import { adminCreateUserAction, listUsersAction, toggleUserActiveAction, resetPasswordAction } from "@/auth/actions";

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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState<UserItem | null>(null);

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

  const loadUsers = async () => {
    setLoading(true);
    const res = await listUsersAction();
    if (res.success && res.users) {
      setUsers(res.users as unknown as UserItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

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
    }, 1200);
  };

  const handleToggleActive = async (user: UserItem) => {
    const res = await toggleUserActiveAction(user.id, !user.active);
    if (res.success) {
      loadUsers();
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="h-6 w-6 text-amber-500" /> User Management
          </h1>
          <p className="text-slate-400 text-sm">
            Manage system users, roles, and access credentials.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-md transition-colors"
        >
          <UserPlus className="w-4 h-4 mr-2" /> Add User
        </button>
      </div>

      {loading ? (
        <div className="p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
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
                    <td className="py-3 px-4 text-slate-300 font-medium">
                      {u.name}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {u.email}
                    </td>
                    <td className="py-3 px-4">
                      {getRoleBadge(u.role)}
                    </td>
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
                        title="Reset Password"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(u)}
                        title={u.active ? "Deactivate User" : "Activate User"}
                        className={`p-1.5 rounded-lg transition-colors ${
                          u.active
                            ? "text-slate-400 hover:text-rose-400 hover:bg-rose-950/40"
                            : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/40"
                        }`}
                      >
                        {u.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create User */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800">
            <h3 className="text-lg font-bold text-slate-100 mb-4">
              Create New User
            </h3>
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
                  Login ID (6-12 chars, letters/numbers)
                </label>
                <input
                  type="text"
                  required
                  value={newForm.loginId}
                  onChange={(e) => setNewForm({ ...newForm, loginId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newForm.name}
                  onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newForm.email}
                  onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={newForm.password}
                  onChange={(e) => setNewForm({ ...newForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Role
                </label>
                <select
                  value={newForm.role}
                  onChange={(e) => setNewForm({ ...newForm, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="USER">USER (Customer Portal)</option>
                  <option value="ACCOUNTANT">ACCOUNTANT (Accounting & Sales)</option>
                  <option value="ADMIN">ADMIN (Full System Access)</option>
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

      {/* Modal: Reset Password */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800">
            <h3 className="text-lg font-bold text-slate-100 mb-2">
              Reset Password
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Set new password for <span className="font-semibold text-slate-200">{showResetModal.name} ({showResetModal.loginId})</span>.
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
