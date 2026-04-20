export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div 
      className="min-h-screen bg-white dark:bg-slate-950 w-full md:max-w-[480px] md:mx-auto md:shadow-xl md:border-x md:border-slate-200 dark:md:border-slate-800 relative z-0"
      style={{ transform: "translateZ(0)", overflowX: "hidden" }}
    >
      {children}
    </div>
  );
}