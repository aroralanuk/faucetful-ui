import Image from 'next/image';

import { links } from '../../consts/links';
import Github from '../../images/logos/github.svg';
import Logo from '../../images/logos/hyperlane-logo-white.svg';
import Twitter from '../../images/logos/twitter.svg';

export function Footer() {
  return (
    <footer className="py-4 opacity-80">
      <div className="flex flex-row justify-between items-center gap-6 sm:gap-0">
        <div className="flex items-center py-4">
          <div className="flex">
            <Image src={Logo} width={50} height={50} alt="" />
          </div>
          <a className="hidden sm:flex flex-col ml-3" href={links.home}>
            <p className="text-sm font-light leading-5">
              Powered by
              <br />
              <span className="text-lg font-medium">Hyperlane</span>
            </p>
          </a>
        </div>
        <div className="flex">
          <div className="flex flex-col">
            <FooterIconLink href={links.twitter} imgSrc={Twitter} text="Twitter" />
          </div>
          <div className="flex flex-col ml-16">
            <FooterIconLink href={links.github} imgSrc={Github} text="Github" />
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterIconLink({ href, imgSrc, text }: { href: string; imgSrc: any; text: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1.5 flex items-center hover:underline underline-offset-4 hover:opacity-70 transition-all"
    >
      <Image src={imgSrc} width={18} height={18} alt="" />
      <span className="ml-2.5 text-sm">{text}</span>
    </a>
  );
}
