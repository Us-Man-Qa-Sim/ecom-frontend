import { ThemeToggle } from '@/components/theme-toggle';

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ecom</h1>
        <ThemeToggle />
      </div>
      <p className="text-muted-foreground">The storefront is being built.</p>
    </main>
  );
}
