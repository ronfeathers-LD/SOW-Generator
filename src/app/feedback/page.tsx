import { Suspense } from 'react';
import FeedbackList from './FeedbackList';

export const metadata = {
  title: 'Feedback & Issues',
};

export default function FeedbackPage() {
  return (
    <Suspense>
      <FeedbackList />
    </Suspense>
  );
}
