"use client";

export default function Header() {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center py-2">
          <span className="text-xs font-bold tracking-widest uppercase text-gray-900">
            SOW Generator
          </span>
          <span className="mx-2 text-gray-300">·</span>
          <span className="text-xs tracking-wider uppercase text-gray-400">
            Internal Tool
          </span>
        </div>
      </div>
    </div>
  );
}
