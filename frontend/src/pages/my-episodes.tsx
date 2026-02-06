import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Redirect to the main episodes page
const MyEpisodesPage: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/episodes');
  }, [router]);

  return null;
};

export default MyEpisodesPage;