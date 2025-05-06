import Leaderboard from '@/components/waitlist/Leaderboard';

export const metadata = {
  title: 'Yield Wars - Referral Leaderboard',
  description: 'See who is leading the Yield Wars referral contest',
};

export default function LeaderboardPage() {
  return (
    <main className="min-h-screen flex flex-col items-center pt-12 pb-24">
      <Leaderboard />
    </main>
  );
}