import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description: string;
  canonical: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  noIndex?: boolean;
}
const defaultImage = "https://vpnkeen.com/og-image.png";

const SEOHead = ({ title, description, canonical, ogTitle, ogDescription, ogImage, noIndex }: SEOHeadProps) => {
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
      <meta property="og:image" content={ogImage ?? defaultImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle ?? title} />
      <meta name="twitter:description" content={ogDescription ?? description} />
      <meta name="twitter:image" content={ogImage ?? defaultImage} />
    </Helmet>
  );
};

export default SEOHead;