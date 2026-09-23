import { SocialIcon } from '@/lib/social/SocialIcon';
import { socialPlatformOf } from '@/lib/social/socialPlatform';

interface Props {
  readonly links: readonly { readonly platform: string; readonly url: string }[];
  readonly label: string;
}

/** Yuvarlak ikon düğmeleri (04-DESIGN-RULES §3: yuvarlak yalnız ikon düğmesinde). İkon URL'den tanınır; panel etiketi erişilebilir ad. */
export function SocialLinks({ links, label }: Props) {
  if (links.length === 0) return null;
  return (
    <ul aria-label={label} className="social-links">
      {links.map((link) => (
        <li key={link.url}>
          <a href={link.url} rel="noopener noreferrer" target="_blank" className="social-link" aria-label={link.platform} title={link.platform}>
            <SocialIcon platform={socialPlatformOf(link.url)} />
          </a>
        </li>
      ))}
    </ul>
  );
}
