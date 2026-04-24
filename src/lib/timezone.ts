// Map Canadian province → IANA timezone. Single source of truth for any feature
// that needs to know the client's timezone without asking them for it.

type Province = 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'NT' | 'NU' | 'ON' | 'PE' | 'QC' | 'SK' | 'YT';

const PROVINCE_TZ: Record<Province, string> = {
  AB: 'America/Edmonton',      // Mountain
  BC: 'America/Vancouver',     // Pacific (most of BC; a sliver is Mountain)
  MB: 'America/Winnipeg',      // Central
  NB: 'America/Moncton',       // Atlantic
  NL: 'America/St_Johns',      // Newfoundland (UTC-3:30)
  NS: 'America/Halifax',       // Atlantic
  NT: 'America/Yellowknife',   // Mountain
  NU: 'America/Iqaluit',       // Eastern (most of Nunavut)
  ON: 'America/Toronto',       // Eastern (most of ON)
  PE: 'America/Halifax',       // Atlantic
  QC: 'America/Toronto',       // Eastern
  SK: 'America/Regina',        // Central, no DST
  YT: 'America/Whitehorse',    // Mountain (year-round)
};

/** Returns the IANA timezone for a Canadian province code, or null. */
export function timezoneForProvince(province: string | null | undefined): string | null {
  if (!province) return null;
  const p = province.toUpperCase() as Province;
  return PROVINCE_TZ[p] ?? null;
}
