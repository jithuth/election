export const metadata = {
  title: 'Admin Portal | Live Election Intelligence',
  description: 'Secure management console for live election trends and channel distribution.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function AdminLayout({ children }) {
  return (
    <section style={{ height: '100vh', background: '#000' }}>
      {children}
    </section>
  );
}
