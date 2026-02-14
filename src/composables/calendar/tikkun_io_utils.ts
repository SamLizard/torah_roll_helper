const slugify = (str: string) => {
  return str
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
}

export { 
  slugify
};