import Image from 'next/image';
import Link from 'next/link';

import { WalletControlBar } from '../../features/wallet/WalletControlBar';
import Logo from '../../images/logos/faucetful-logo.png';

export function Header() {
  return (
    <header className="pt-3 pb-2 w-full">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image src={Logo} width={210} alt="" className="hidden sm:block mt-0.5 ml-2" />
        </Link>
        <WalletControlBar />
      </div>
    </header>
  );
}
