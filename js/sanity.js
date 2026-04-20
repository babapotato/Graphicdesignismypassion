// Lightweight Sanity bridge for static sites (GitHub Pages-friendly).
//
// Recommended setup: put your Sanity values in `content/site_data.json` under:
//   { "site": { "sanity": { "projectId": "...", "dataset": "production" } } }
//
// You can also hardcode them here, but keeping them in JSON makes it easier to edit.
export const SANITY_CONFIG = {
  projectId: 'YOUR_PROJECT_ID',
  dataset: 'YOUR_DATASET',
  apiVersion: '2026-01-01',
  useCdn: true,
};

export function setSanityConfig(partial) {
  if (!partial || typeof partial !== 'object') return;
  if (typeof partial.projectId === 'string') SANITY_CONFIG.projectId = partial.projectId;
  if (typeof partial.dataset === 'string') SANITY_CONFIG.dataset = partial.dataset;
  if (typeof partial.apiVersion === 'string') SANITY_CONFIG.apiVersion = partial.apiVersion;
  if (typeof partial.useCdn === 'boolean') SANITY_CONFIG.useCdn = partial.useCdn;
}

function hasSanityConfig() {
  return (
    SANITY_CONFIG.projectId &&
    SANITY_CONFIG.dataset &&
    SANITY_CONFIG.projectId !== 'YOUR_PROJECT_ID' &&
    SANITY_CONFIG.dataset !== 'YOUR_DATASET'
  );
}

export async function fetchProjectsFromSanity() {
  if (!hasSanityConfig()) return null;

  const [{ createClient }, { default: imageUrlBuilder }] = await Promise.all([
    import('https://esm.sh/@sanity/client@6'),
    import('https://esm.sh/@sanity/image-url@1')
  ]);

  const client = createClient({
    projectId: SANITY_CONFIG.projectId,
    dataset: SANITY_CONFIG.dataset,
    apiVersion: SANITY_CONFIG.apiVersion,
    useCdn: SANITY_CONFIG.useCdn
  });

  const builder = imageUrlBuilder(client);

  const query = /* groq */ `
    *[_type == "project"] | order(_createdAt desc) {
      _id,
      title,
      description,
      technologies,
      url,
      mainImage
    }
  `;

  const raw = await client.fetch(query);
  if (!Array.isArray(raw) || raw.length === 0) return [];

  return raw.map((p) => {
    const img = p?.mainImage
      ? builder
          .image(p.mainImage)
          .width(900)
          .height(900)
          .fit('crop')
          .auto('format')
          .quality(80)
          .url()
      : null;

    return {
      id: p?._id,
      title: p?.title || '',
      description: p?.description || '',
      technologies: Array.isArray(p?.technologies) ? p.technologies : [],
      url: p?.url || '',
      image: img || undefined
    };
  });
}

