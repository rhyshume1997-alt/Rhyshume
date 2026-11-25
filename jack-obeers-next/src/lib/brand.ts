/**
 * One place for the brand pieces that will be swapped for the shop's own files.
 *
 * logo     The logo. Switch to the SVG once supplied (put it in public/media/jack-logo.svg).
 * facade   The photo of the shop front (public/media/shopfront.webp). null shows the temporary drawing.
 * interior The photo of the inside of the shop (public/media/interior.webp). null shows a temporary scene.
 * door     Where the real door is in the facade photo, as fractions of the picture (0 to 1).
 *          The opening animation pushes in on this rectangle and swings a door open inside it.
 */
export const BRAND = {
  logo: "/media/jack-logo.svg",
  mascot: "/media/jack-mascot.svg",
  facade: null as string | null,
  interior: null as string | null,
  door: { left: 0.43, top: 0.36, width: 0.14, height: 0.56 },
  ratio: 1.6,
};

export const SHOP = {
  name: "Jack O’Beers & Deli",
  address: ["13 Station Road", "Milngavie", "G62 8PG"],
  phone: "07405 480950",
  email: "sales@jackobeers.com",
  hours: "Wednesday to Monday, 11am to 7pm",
  owners: ["Michael", "Tanya"],
};
