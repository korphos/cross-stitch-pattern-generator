import type { DmcColor } from '../lib/types'
import { dmcColors } from './dmcColors'

/**
 * DMC "Light Effects" metallic floss (E-prefixed codes), approximate sRGB
 * values cross-referenced across retailer color charts. E130 (Gemstones)
 * and E135 (Golden Dawn) are variegated multi-color threads with no single
 * true RGB - their entries are a rough average, good enough for "is this
 * close to my pattern color" suggestions but not for exact rendering.
 */
const lightEffects: DmcColor[] = [
  { code: 'E5200', name: 'White', r: 255, g: 255, b: 255, finish: 'metallic' },
  { code: 'E130', name: 'Gemstones', r: 140, g: 100, b: 150, finish: 'metallic' },
  { code: 'E135', name: 'Golden Dawn', r: 180, g: 160, b: 90, finish: 'metallic' },
  { code: 'E155', name: 'Amethyst', r: 151, g: 116, b: 182, finish: 'metallic' },
  { code: 'E168', name: 'Silver', r: 177, g: 174, b: 183, finish: 'metallic' },
  { code: 'E211', name: 'Lilac', r: 229, g: 189, b: 237, finish: 'metallic' },
  { code: 'E301', name: 'Copper', r: 170, g: 82, b: 55, finish: 'metallic' },
  { code: 'E310', name: 'Ebony', r: 20, g: 20, b: 20, finish: 'metallic' },
  { code: 'E316', name: 'Pink Amethyst', r: 188, g: 117, b: 127, finish: 'metallic' },
  { code: 'E317', name: 'Titanium', r: 109, g: 100, b: 105, finish: 'metallic' },
  { code: 'E321', name: 'Red Ruby', r: 189, g: 17, b: 54, finish: 'metallic' },
  { code: 'E334', name: 'Blue Topaz', r: 96, g: 133, b: 184, finish: 'metallic' },
  { code: 'E415', name: 'Pewter', r: 184, g: 185, b: 189, finish: 'metallic' },
  { code: 'E436', name: 'Golden Oak', r: 199, g: 133, b: 89, finish: 'metallic' },
  { code: 'E677', name: 'White Gold', r: 242, g: 220, b: 159, finish: 'metallic' },
  { code: 'E699', name: 'Green Emerald', r: 7, g: 91, b: 38, finish: 'metallic' },
  { code: 'E703', name: 'Light Green Emerald', r: 99, g: 179, b: 48, finish: 'metallic' },
  { code: 'E718', name: 'Pink Garnet', r: 203, g: 32, b: 137, finish: 'metallic' },
  { code: 'E746', name: 'Cream', r: 250, g: 242, b: 213, finish: 'metallic' },
  { code: 'E747', name: 'Baby Blue', r: 206, g: 233, b: 234, finish: 'metallic' },
  { code: 'E815', name: 'Dark Red Ruby', r: 128, g: 11, b: 52, finish: 'metallic' },
  { code: 'E818', name: 'Soft Pink', r: 254, g: 222, b: 221, finish: 'metallic' },
  { code: 'E825', name: 'Blue Sapphire', r: 52, g: 88, b: 143, finish: 'metallic' },
  { code: 'E898', name: 'Dark Oak', r: 83, g: 47, b: 27, finish: 'metallic' },
  { code: 'E940', name: 'Glow in the Dark', r: 245, g: 250, b: 240, finish: 'metallic' },
  { code: 'E966', name: 'Lime', r: 148, g: 210, b: 138, finish: 'metallic' },
  { code: 'E967', name: 'Soft Peach', r: 255, g: 194, b: 172, finish: 'metallic' },
  { code: 'E980', name: 'Neon Yellow', r: 240, g: 255, b: 0, finish: 'metallic' },
  { code: 'E990', name: 'Neon Green', r: 6, g: 236, b: 33, finish: 'metallic' },
  { code: 'E3685', name: 'Rosewood', r: 121, g: 38, b: 59, finish: 'metallic' },
  { code: 'E3747', name: 'Sky Blue', r: 184, g: 204, b: 228, finish: 'metallic' },
  { code: 'E3821', name: 'Light Gold', r: 234, g: 189, b: 0, finish: 'metallic' },
  { code: 'E3837', name: 'Purple Ruby', r: 112, g: 48, b: 160, finish: 'metallic' },
  { code: 'E3843', name: 'Light Blue Sapphire', r: 0, g: 176, b: 240, finish: 'metallic' },
  { code: 'E3849', name: 'Aquamarine Blue', r: 0, g: 255, b: 153, finish: 'metallic' },
  { code: 'E3852', name: 'Dark Gold', r: 204, g: 165, b: 0, finish: 'metallic' },
]

/**
 * DMC Satin floss (S-prefixed codes) - a shinier rayon version of a
 * standard floss color. Each code shares its number with the closest
 * standard DMC color (e.g. S602 <-> 602), so its sRGB is reused as-is:
 * same dye family, only the fiber's sheen differs, which a flat sRGB
 * approximation can't represent anyway.
 */
const satin: DmcColor[] = [
  { code: 'S211', name: 'Lavender Light (Satin)', r: 227, g: 203, b: 227, finish: 'satin' },
  { code: 'S307', name: 'Lemon (Satin)', r: 253, g: 237, b: 84, finish: 'satin' },
  { code: 'S310', name: 'Black (Satin)', r: 0, g: 0, b: 0, finish: 'satin' },
  { code: 'S321', name: 'Red (Satin)', r: 199, g: 43, b: 59, finish: 'satin' },
  { code: 'S326', name: 'Rose Very Dark (Satin)', r: 179, g: 59, b: 75, finish: 'satin' },
  { code: 'S336', name: 'Navy Blue (Satin)', r: 37, g: 59, b: 115, finish: 'satin' },
  { code: 'S351', name: 'Coral (Satin)', r: 233, g: 106, b: 103, finish: 'satin' },
  { code: 'S352', name: 'Coral Light (Satin)', r: 253, g: 156, b: 151, finish: 'satin' },
  { code: 'S367', name: 'Pistachio Green Dark (Satin)', r: 97, g: 122, b: 82, finish: 'satin' },
  { code: 'S414', name: 'Steel Gray Dark (Satin)', r: 140, g: 140, b: 140, finish: 'satin' },
  { code: 'S415', name: 'Pearl Gray (Satin)', r: 211, g: 211, b: 214, finish: 'satin' },
  { code: 'S434', name: 'Brown Light (Satin)', r: 152, g: 94, b: 51, finish: 'satin' },
  { code: 'S469', name: 'Avocado Green (Satin)', r: 114, g: 132, b: 60, finish: 'satin' },
  { code: 'S471', name: 'Avocado Green V Light (Satin)', r: 174, g: 191, b: 121, finish: 'satin' },
  { code: 'S472', name: 'Avocado Green U Light (Satin)', r: 216, g: 228, b: 152, finish: 'satin' },
  { code: 'S501', name: 'Blue Green Dark (Satin)', r: 57, g: 111, b: 82, finish: 'satin' },
  { code: 'S504', name: 'Blue Green Very Light (Satin)', r: 196, g: 222, b: 204, finish: 'satin' },
  { code: 'S550', name: 'Violet Very Dark (Satin)', r: 92, g: 24, b: 78, finish: 'satin' },
  { code: 'S552', name: 'Violet Medium (Satin)', r: 128, g: 58, b: 107, finish: 'satin' },
  { code: 'S553', name: 'Violet (Satin)', r: 163, g: 99, b: 139, finish: 'satin' },
  { code: 'S601', name: 'Cranberry Dark (Satin)', r: 209, g: 40, b: 106, finish: 'satin' },
  { code: 'S602', name: 'Cranberry Medium (Satin)', r: 226, g: 72, b: 116, finish: 'satin' },
  { code: 'S606', name: 'Orange-Red Bright (Satin)', r: 250, g: 50, b: 3, finish: 'satin' },
  { code: 'S666', name: 'Bright Red (Satin)', r: 227, g: 29, b: 66, finish: 'satin' },
  { code: 'S676', name: 'Old Gold Light (Satin)', r: 229, g: 206, b: 151, finish: 'satin' },
  { code: 'S700', name: 'Green Bright (Satin)', r: 7, g: 115, b: 27, finish: 'satin' },
  { code: 'S702', name: 'Kelly Green (Satin)', r: 71, g: 167, b: 47, finish: 'satin' },
  { code: 'S712', name: 'Cream (Satin)', r: 255, g: 251, b: 239, finish: 'satin' },
  { code: 'S726', name: 'Topaz Light (Satin)', r: 253, g: 215, b: 85, finish: 'satin' },
  { code: 'S738', name: 'Tan Very Light (Satin)', r: 236, g: 204, b: 158, finish: 'satin' },
  { code: 'S739', name: 'Tan Ultra Very Light (Satin)', r: 248, g: 228, b: 200, finish: 'satin' },
  { code: 'S741', name: 'Tangerine Medium (Satin)', r: 255, g: 163, b: 43, finish: 'satin' },
  { code: 'S744', name: 'Yellow Pale (Satin)', r: 255, g: 231, b: 147, finish: 'satin' },
  { code: 'S745', name: 'Yellow Pale Light (Satin)', r: 255, g: 233, b: 173, finish: 'satin' },
  { code: 'S762', name: 'Pearl Gray Very Light (Satin)', r: 236, g: 236, b: 236, finish: 'satin' },
  { code: 'S776', name: 'Pink Medium (Satin)', r: 252, g: 176, b: 185, finish: 'satin' },
  { code: 'S797', name: 'Royal Blue (Satin)', r: 19, g: 71, b: 125, finish: 'satin' },
  { code: 'S798', name: 'Delft Blue Dark (Satin)', r: 70, g: 106, b: 142, finish: 'satin' },
  { code: 'S799', name: 'Delft Blue Medium (Satin)', r: 116, g: 142, b: 182, finish: 'satin' },
  { code: 'S800', name: 'Delft Blue Pale (Satin)', r: 192, g: 204, b: 222, finish: 'satin' },
  { code: 'S818', name: 'Baby Pink (Satin)', r: 255, g: 223, b: 217, finish: 'satin' },
  { code: 'S820', name: 'Royal Blue Very Dark (Satin)', r: 14, g: 54, b: 92, finish: 'satin' },
  { code: 'S841', name: 'Beige Brown Light (Satin)', r: 182, g: 155, b: 126, finish: 'satin' },
  { code: 'S898', name: 'Coffee Brown Very Dark (Satin)', r: 73, g: 42, b: 19, finish: 'satin' },
  { code: 'S899', name: 'Rose Medium (Satin)', r: 242, g: 118, b: 136, finish: 'satin' },
  { code: 'S909', name: 'Emerald Green Very Dark (Satin)', r: 21, g: 111, b: 73, finish: 'satin' },
  { code: 'S915', name: 'Plum Dark (Satin)', r: 130, g: 0, b: 67, finish: 'satin' },
  { code: 'S931', name: 'Antique Blue Medium (Satin)', r: 106, g: 133, b: 158, finish: 'satin' },
  { code: 'S932', name: 'Antique Blue Light (Satin)', r: 162, g: 181, b: 198, finish: 'satin' },
  { code: 'S943', name: 'Green Bright Medium (Satin)', r: 61, g: 147, b: 132, finish: 'satin' },
  { code: 'S959', name: 'Sea Green Medium (Satin)', r: 89, g: 199, b: 180, finish: 'satin' },
  { code: 'S964', name: 'Sea Green Light (Satin)', r: 169, g: 226, b: 216, finish: 'satin' },
  { code: 'S976', name: 'Golden Brown Medium (Satin)', r: 194, g: 129, b: 66, finish: 'satin' },
  { code: 'S991', name: 'Aquamarine Dark (Satin)', r: 71, g: 123, b: 110, finish: 'satin' },
  { code: 'S995', name: 'Electric Blue Dark (Satin)', r: 38, g: 150, b: 182, finish: 'satin' },
  { code: 'S3371', name: 'Black Brown (Satin)', r: 30, g: 17, b: 8, finish: 'satin' },
  { code: 'S3607', name: 'Plum Light (Satin)', r: 197, g: 73, b: 137, finish: 'satin' },
  { code: 'S3685', name: 'Mauve Very Dark (Satin)', r: 136, g: 21, b: 49, finish: 'satin' },
  { code: 'S3820', name: 'Straw Dark (Satin)', r: 223, g: 182, b: 95, finish: 'satin' },
  { code: 'S5200', name: 'Snow White (Satin)', r: 255, g: 255, b: 255, finish: 'satin' },
]

/** Specialty threads (metallic Light Effects + shiny Satin) - not used for automatic matching by default, only offered as an alternative when close to a chosen standard color. */
export const dmcSpecialtyColors: DmcColor[] = [...lightEffects, ...satin]

/** Every known thread, standard and specialty - for inventory management (Settings) and manual color search. */
export const allDmcColors: DmcColor[] = [...dmcColors, ...dmcSpecialtyColors]
