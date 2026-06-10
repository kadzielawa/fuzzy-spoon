import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { AuthDebugger } from '../components/AuthDebugger';

export default function App({ Component, pageProps }: AppProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <>
      <Component {...pageProps} />
      {false && <AuthDebugger />}
    </>
  );
}
