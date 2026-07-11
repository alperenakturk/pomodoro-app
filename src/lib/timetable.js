export function isCurrentBlock(block, now) {
  return block.start <= now && now <= block.end
}

function blockMinutes(block) {
  const [sh, sm] = block.start.split(':').map(Number)
  const [eh, em] = block.end.split(':').map(Number)
  return Math.max(0, eh * 60 + em - (sh * 60 + sm))
}

export function totalTimetableHours(blocks) {
  return blocks.reduce((sum, b) => sum + blockMinutes(b), 0) / 60
}
