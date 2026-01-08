'use client';
import Link from 'next/link';

type Props = React.ComponentProps<'a'> & { href: string };

export default function LinkComponent({ href, children, ...rest }: Props) {
  const isExternal = /^https?:\/\//i.test(href);
  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  // Interno: NO crear <a> adicional, Next ya lo hace
  return (
    <Link href={href} {...rest}>
      {children}
    </Link>
  );
}