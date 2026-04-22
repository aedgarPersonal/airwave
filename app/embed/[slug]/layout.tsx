// Minimal layout for the iframe body — no Clerk, no marketing chrome.
// The iframe inherits fonts and CSS from the root layout.
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-full">{children}</div>;
}
