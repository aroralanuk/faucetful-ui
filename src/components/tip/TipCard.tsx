import { BigNumber } from 'ethers';
import Image from 'next/image';
import { useEffect, useState } from 'react';

import { links } from '../../consts/links';
import { createTrade } from '../../features/contracts/uniswap';
import InfoCircle from '../../images/icons/info-circle.svg';
import { fromWeiRounded, toWei } from '../../utils/amount';
import { logger } from '../../utils/logger';

export function TipCard() {
  // init price as bignumer useState
  const [price, setPrice] = useState(BigNumber.from(0));

  useEffect(() => {
    const intervalId = setInterval(() => {
      (async () => {
        const { amountOut } = await createTrade(false, BigNumber.from(toWei(0.001).toString()));
        setPrice(amountOut[0].mul(1000));
      })().catch((error) => {
        // Handle the error here or log it
        logger.error("Error occurred in Tips's useEffect async function:", error);
      });
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="relative px-3 py-3 w-100 sm:w-[31rem] text-inverted bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-700 shadow-lg rounded opacity-95">
      <h2 className="text-white sm:text-lg center" style={{ textAlign: 'center' }}>
        Swap to{' '}
        <a href="https://arbiscan.io/token/0x18784bc2fee75461ef8e819e608b25af9f352080">GETH</a> on
        Arbitrum
      </h2>
      <div className="flex items-end text-inverted justify-between">
        <div className="flex-grow flex items-end mt-3.5 text-black sm:text-sm">
          <p className="px-2 text-inverted">Current Price: </p>
          <div className="flex pr-3 items-end text-inverted">
            <h1 className="flex-grow text-lg px-2 text-inverted" style={{ fontSize: '1.5rem' }}>
              {fromWeiRounded(price.toString())}
            </h1>
            <p className="text-inverted">GETH/ETH</p>
          </div>
        </div>
        <a
          href={links.uniswap}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 px-3 py-1.5 flex items-center bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-xs sm:text-sm text-blue-500 rounded-md transition-all"
        >
          <Image src={InfoCircle} width={16} alt="" />
          <span className="ml-1.5 text-bluish-500">Go to Uniswap</span>
        </a>
      </div>

      <div className="absolute right-3 top-3 invert"></div>
    </div>
  );
}
