"use client";

export default function Header() {
  return (
    <header style={{backgroundColor: '#2a2a2a'}}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center py-3">
          <span className="text-xs font-medium tracking-widest uppercase opacity-40" style={{color: '#26D07C', letterSpacing: '0.15em'}}>
            SOW Generator · Internal Tool
          </span>
        </div>
      </div>
    </header>
  );
}
