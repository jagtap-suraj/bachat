export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="container mx-auto my-32">{children}</div>;
}
