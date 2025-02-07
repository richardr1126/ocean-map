export function Header() {
  return (
    <header className="w-full px-4 py-2 flex fixed top-0 bg-background z-50 shadow-lg">
      <h1 className="text-xl font-bold flex items-center gap-2 truncate">
        <span role="img" aria-label="anchor">⚓</span>
        Ocean Geographical Pollution Map
      </h1>
    </header>
  );
}
