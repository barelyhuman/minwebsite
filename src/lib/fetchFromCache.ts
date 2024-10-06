import { db } from './db.js';

export const fetchFromCache = async (fallbackFetch) => {
  try {
    let data = await db('sites').where({});
    if (data.length === 0) data = await fallbackFetch();
    return data;
  } catch (err) {
    console.error('Failed to fetch from db, fetching from fallback');
    return fallbackFetch();
  }
};
