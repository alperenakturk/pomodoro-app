export function isCurrentBlock(block, now) {
  return block.start <= now && now <= block.end
}
