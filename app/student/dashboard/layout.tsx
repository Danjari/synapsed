


export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ambient-light">
      <main>
        {children}
      </main>
    </div>
  )
}
