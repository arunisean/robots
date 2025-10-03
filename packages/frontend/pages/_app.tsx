import type { AppProps } from 'next/app';
import { WalletProvider } from '../src/components/WalletProvider';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WalletProvider 
      autoConnect={true}
      supportedChains={[1, 11155111]} // 以太坊主网和Sepolia测试网
      onError={(error) => {
        console.error('Wallet Provider Error:', error);
        // 这里可以添加全局错误处理，比如显示toast通知
      }}
    >
      <Component {...pageProps} />
    </WalletProvider>
  );
}