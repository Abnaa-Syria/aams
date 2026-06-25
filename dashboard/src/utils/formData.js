/** Convert FormData to plain object (first value per key). */
export function formDataToObject(formData) {
  const obj = {};
  if (!formData || typeof formData.entries !== 'function') return obj;
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    if (obj[key] === undefined) obj[key] = value;
  }
  return obj;
}

/** Keep only File entries from FormData. */
export function formDataFiles(formData) {
  const files = {};
  if (!formData || typeof formData.entries !== 'function') return files;
  for (const [key, value] of formData.entries()) {
    if (value instanceof File && value.size > 0) {
      if (!files[key]) files[key] = [];
      files[key].push(value);
    }
  }
  return files;
}

export function buildPatchFormData(formData) {
  const fd = new FormData();
  for (const [key, value] of formData.entries()) {
    fd.append(key, value);
  }
  return fd;
}
