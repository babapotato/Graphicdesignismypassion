// Lightweight Sanity bridge for static sites (GitHub Pages-friendly).
// Fill these from Sanity Manage → your project → API:
// - projectId: e.g. "abc123xy"
// - dataset: e.g. "production"
export const SANITY_CONFIG = {
  projectId: 'Yk6gecw8l',
  dataset: 'production',
  apiVersion: '2026-01-01',
  useCdn: true
};

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

