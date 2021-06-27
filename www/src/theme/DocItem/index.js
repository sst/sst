import React from "react";
import { Base64 } from "js-base64";
import Head from "@docusaurus/Head";
import OriginalDocItem from "@theme-original/DocItem";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

/**
 * The DocItem component renders <Head> component for a page.
 * We are wrapping around the original component and overriding
 * the og:image tags.
 *
 * https://docusaurus.io/docs/using-themes/#wrapping-theme-components
 *
 * The <Head> component overrides any previously set tags.
 *
 * https://docusaurus.io/docs/docusaurus-core#components
 *
 */
export default function DocItem(props) {
  const { siteConfig } = useDocusaurusContext();
  const { id, title } = props.content.metadata;
  // Get the social cards URL from docusaurus.config.js
  const { socialCardsUrl } = siteConfig.customFields;

  const encodedTitle = encodeURIComponent(
    Base64.encode(
      // Convert to ASCII
      encodeURIComponent(
        // Truncate to fit S3's max key size
        title.substring(0, 700)
      )
    )
  );

  // Check if the page is one of the constructs
  const metaImageUrl = id.startsWith("constructs/")
    ? `${socialCardsUrl}/serverless-stack-constructs/${encodedTitle}.png`
    : `${socialCardsUrl}/serverless-stack-docs/${encodedTitle}.png`;

  return (
    <>
      <OriginalDocItem {...props} />
      <Head>
        <meta property="og:image" content={metaImageUrl} />
        <meta name="twitter:image" content={metaImageUrl} />
      </Head>
    </>
  );
}
