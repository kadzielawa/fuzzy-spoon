import type { NextPage } from 'next';
import Head from 'next/head';
import IDPPortal from '../components/IDPPortal';

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>IDP Portal – Infrastructure Deployment Platform</title>
        <meta
          name="description"
          content="Deploy GCP infrastructure with pre-configured templates. Role-based access control, cost estimation, and approval workflows."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <IDPPortal />
    </>
  );
};

export default Home;
