"use client";

export default function Header() {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center py-2.5">
          <span className="text-sm font-bold tracking-widest uppercase text-gray-900">
            SOW Generator
          </span>
          <span className="mx-3 text-gray-300 font-light">·</span>
          <span className="text-sm tracking-widest uppercase text-gray-400 font-medium">
            Internal Tool
          </span>
        </div>
      </div>
    </div>
  );
}
