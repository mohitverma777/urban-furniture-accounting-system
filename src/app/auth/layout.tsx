/**
 * Auth pages layout — no sidebar, no header.
 * Full-screen centered layout for login, signup, forgot-password.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      {children}
    </div>
  );
}
