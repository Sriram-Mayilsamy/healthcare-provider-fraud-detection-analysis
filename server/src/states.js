const SSA_STATE_CODES = {
  1: { name: "Alabama", abbr: "AL" },
  2: { name: "Alaska", abbr: "AK" },
  3: { name: "Arizona", abbr: "AZ" },
  4: { name: "Arkansas", abbr: "AR" },
  5: { name: "California", abbr: "CA" },
  6: { name: "Colorado", abbr: "CO" },
  7: { name: "Connecticut", abbr: "CT" },
  8: { name: "Delaware", abbr: "DE" },
  9: { name: "District of Columbia", abbr: "DC" },
  10: { name: "Florida", abbr: "FL" },
  11: { name: "Georgia", abbr: "GA" },
  12: { name: "Hawaii", abbr: "HI" },
  13: { name: "Idaho", abbr: "ID" },
  14: { name: "Illinois", abbr: "IL" },
  15: { name: "Indiana", abbr: "IN" },
  16: { name: "Iowa", abbr: "IA" },
  17: { name: "Kansas", abbr: "KS" },
  18: { name: "Kentucky", abbr: "KY" },
  19: { name: "Louisiana", abbr: "LA" },
  20: { name: "Maine", abbr: "ME" },
  21: { name: "Maryland", abbr: "MD" },
  22: { name: "Massachusetts", abbr: "MA" },
  23: { name: "Michigan", abbr: "MI" },
  24: { name: "Minnesota", abbr: "MN" },
  25: { name: "Mississippi", abbr: "MS" },
  26: { name: "Missouri", abbr: "MO" },
  27: { name: "Montana", abbr: "MT" },
  28: { name: "Nebraska", abbr: "NE" },
  29: { name: "Nevada", abbr: "NV" },
  30: { name: "New Hampshire", abbr: "NH" },
  31: { name: "New Jersey", abbr: "NJ" },
  32: { name: "New Mexico", abbr: "NM" },
  33: { name: "New York", abbr: "NY" },
  34: { name: "North Carolina", abbr: "NC" },
  35: { name: "North Dakota", abbr: "ND" },
  36: { name: "Ohio", abbr: "OH" },
  37: { name: "Oklahoma", abbr: "OK" },
  38: { name: "Oregon", abbr: "OR" },
  39: { name: "Pennsylvania", abbr: "PA" },
  41: { name: "Rhode Island", abbr: "RI" },
  42: { name: "South Carolina", abbr: "SC" },
  43: { name: "South Dakota", abbr: "SD" },
  44: { name: "Tennessee", abbr: "TN" },
  45: { name: "Texas", abbr: "TX" },
  46: { name: "Utah", abbr: "UT" },
  47: { name: "Vermont", abbr: "VT" },
  49: { name: "Virginia", abbr: "VA" },
  50: { name: "Washington", abbr: "WA" },
  51: { name: "West Virginia", abbr: "WV" },
  52: { name: "Wisconsin", abbr: "WI" },
  53: { name: "Wyoming", abbr: "WY" },
  54: { name: "Other", abbr: "OT" },
  72: { name: "Puerto Rico", abbr: "PR" },
}

function stateInfo(code) {
  if (!code || code === "Unknown") {
    return { code: "Unknown", abbr: "Unknown", name: "Unknown" }
  }
  const key = Number(code)
  const match = SSA_STATE_CODES[key] || SSA_STATE_CODES[code]
  if (!match) {
    return { code: String(code), abbr: String(code), name: String(code) }
  }
  return { code: String(key || code), abbr: match.abbr, name: match.name }
}

module.exports = { stateInfo }
