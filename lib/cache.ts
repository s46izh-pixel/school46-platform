export const DATA_REVALIDATE_SECONDS = 900;
export const SCHEDULE_REVALIDATE_SECONDS = 300;
export const ADMIN_REVALIDATE_SECONDS = 60;

export const apiCacheHeaders = {
  "Cache-Control": `public, s-maxage=${DATA_REVALIDATE_SECONDS}, stale-while-revalidate=3600`
};

export const shortApiCacheHeaders = {
  "Cache-Control": `public, s-maxage=${ADMIN_REVALIDATE_SECONDS}, stale-while-revalidate=300`
};

export const scheduleApiCacheHeaders = {
  "Cache-Control": `public, s-maxage=${SCHEDULE_REVALIDATE_SECONDS}, stale-while-revalidate=600`
};

export const noStoreHeaders = {
  "Cache-Control": "no-store"
};
