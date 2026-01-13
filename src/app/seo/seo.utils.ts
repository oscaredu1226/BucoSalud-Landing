import { Meta } from '@angular/platform-browser';
import { SITE_URL, DEFAULT_OG_IMAGE } from './seo.constants';

export function setCanonical(meta: Meta, urlPath: string) {

  const href = `${SITE_URL}${urlPath}`;

  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

export function setOpenGraph(meta: Meta, opts: { title: string; description: string; urlPath: string; image?: string }) {
  const url = `${SITE_URL}${opts.urlPath}`;
  const image = opts.image ?? DEFAULT_OG_IMAGE;

  meta.updateTag({ property: 'og:title', content: opts.title });
  meta.updateTag({ property: 'og:description', content: opts.description });
  meta.updateTag({ property: 'og:type', content: 'website' });
  meta.updateTag({ property: 'og:url', content: url });
  meta.updateTag({ property: 'og:image', content: image });

  meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
  meta.updateTag({ name: 'twitter:title', content: opts.title });
  meta.updateTag({ name: 'twitter:description', content: opts.description });
  meta.updateTag({ name: 'twitter:image', content: image });
}
