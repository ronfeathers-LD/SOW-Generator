export default function PrintTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="print-template">
      {children}
    </div>
  );
}
