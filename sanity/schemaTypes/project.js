export default {
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required()
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4
    },
    {
      name: 'mainImage',
      title: 'Main image',
      type: 'image',
      options: { hotspot: true }
    },
    {
      name: 'technologies',
      title: 'Technologies used',
      type: 'array',
      of: [{ type: 'string' }]
    },
    {
      name: 'url',
      title: 'Project URL',
      type: 'url'
    }
  ]
};

