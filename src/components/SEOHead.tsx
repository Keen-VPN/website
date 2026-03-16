import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description: string;
  canonical: string;
  ogTitle?: string;
  ogDescription?: string;
  noIndex?: boolean;
}

const SEOHead = ({ title, description, canonical, ogTitle, ogDescription, noIndex }: SEOHeadProps) => {
  return (
    <Helmet>
      {noIndex && <meta name="robots" content="noindex" />}
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={ogTitle ?? title} />
      <meta property="og:description" content={ogDescription ?? description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content="https://vpnkeen.com/favicon.png" />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={ogTitle ?? title} />
      <meta name="twitter:description" content={ogDescription ?? description} />
      <meta name="twitter:image" content="https://vpnkeen.com/favicon.png" />
    </Helmet>
  );
};

export default SEOHead;