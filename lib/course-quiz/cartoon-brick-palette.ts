export type CartoonBrickPalette = {
  face: string;
  edge: string;
  depth: string;
  brick: string;
  brickSide: string;
  highlight: string;
  letterFill: string;
};

/** 卡通圓角積木糖果色（依選項索引） */
export const CARTOON_BRICK_PALETTES: CartoonBrickPalette[] = [
  {
    face: '#FFF9C4',
    highlight: '#FFFFEB',
    edge: '#E65100',
    depth: '#EF6C00',
    brick: '#FFCA28',
    brickSide: '#FFB300',
    letterFill: '#FFFFFF',
  },
  {
    face: '#E8FFF3',
    highlight: '#F4FFFA',
    edge: '#00695C',
    depth: '#00796B',
    brick: '#4DB6AC',
    brickSide: '#26A69A',
    letterFill: '#FFFFFF',
  },
  {
    face: '#FFE8F0',
    highlight: '#FFF5F9',
    edge: '#AD1457',
    depth: '#C2185B',
    brick: '#F48FB1',
    brickSide: '#EC407A',
    letterFill: '#FFFFFF',
  },
  {
    face: '#E8EEFF',
    highlight: '#F5F8FF',
    edge: '#283593',
    depth: '#3949AB',
    brick: '#9FA8DA',
    brickSide: '#5C6BC0',
    letterFill: '#FFFFFF',
  },
];

export function getCartoonBrickPalette(optionIndex: number): CartoonBrickPalette {
  return CARTOON_BRICK_PALETTES[optionIndex % CARTOON_BRICK_PALETTES.length]!;
}
