import PublicClientLayout from '@/components/layouts/PublicClientLayout'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Этот layout применяется к публичным страницам (корневая страница)
  // /client имеет свой собственный layout, который переопределяет этот
  return <PublicClientLayout>{children}</PublicClientLayout>
}
