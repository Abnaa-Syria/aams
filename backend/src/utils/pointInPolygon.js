/**
 * Ray-casting point-in-polygon for GeoJSON Polygon / MultiPolygon / simple ring array.
 * @param {number} lat
 * @param {number} lng
 * @param {object|Array} boundary - GeoJSON or [[lng,lat],...]
 */
function pointInRing(lat, lng, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect = yi > lat !== yj > lat
      && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function normalizeRings(boundary) {
  if (!boundary) return [];
  if (Array.isArray(boundary)) {
    if (boundary.length && Array.isArray(boundary[0]) && typeof boundary[0][0] === 'number') {
      return [boundary.map(([lng, lat]) => [lng, lat])];
    }
    return boundary;
  }
  if (boundary.type === 'Polygon' && Array.isArray(boundary.coordinates)) {
    return boundary.coordinates.map((ring) => ring.map(([lng, lat]) => [lng, lat]));
  }
  if (boundary.type === 'MultiPolygon' && Array.isArray(boundary.coordinates)) {
    return boundary.coordinates.flat().map((ring) => ring.map(([lng, lat]) => [lng, lat]));
  }
  if (typeof boundary === 'string') {
    try {
      return normalizeRings(JSON.parse(boundary));
    } catch {
      return [];
    }
  }
  return [];
}

function isInsideBoundary(lat, lng, boundary) {
  const rings = normalizeRings(boundary);
  if (!rings.length) return false;
  // GeoJSON: first ring is outer; hole handling simplified — inside outer and not in holes
  const outer = rings[0];
  const latLngRing = outer.map(([lng, la]) => [la, lng]);
  if (!pointInRing(lat, lng, latLngRing)) return false;
  for (let h = 1; h < rings.length; h++) {
    const hole = rings[h].map(([lng, la]) => [la, lng]);
    if (pointInRing(lat, lng, hole)) return false;
  }
  return true;
}

module.exports = { isInsideBoundary, normalizeRings };
