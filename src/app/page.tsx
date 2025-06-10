import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import LoginButton from '../components/LoginButton';

export default async function Home() {
  const session = await getServerSession();

  if (session) {
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">Welcome to SOW Generator</h1>
        <p className="text-xl">Your Statement of Work generation tool</p>
        <LoginButton />
      </div>
    </main>
  )
}
