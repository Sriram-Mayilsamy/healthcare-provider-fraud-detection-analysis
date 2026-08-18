function parseCsvLine(line) {
  const cells = []
  let cell = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          cell += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        cell += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ",") {
      cells.push(cell)
      cell = ""
    } else if (char !== "\r") {
      cell += char
    }
  }

  cells.push(cell)
  return cells
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0)
  if (lines.length === 0) return []
  const headers = parseCsvLine(lines[0])
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] ?? ""
    })
    return row
  })
}

module.exports = { parseCsv, parseCsvLine }
