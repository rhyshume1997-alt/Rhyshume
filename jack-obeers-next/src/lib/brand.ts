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
  /**
   * The video inside the arched window at the top of the home page. As you scroll, the window grows to full
   * screen, so this footage is what carries you into the shop. Today it is the temporary pour clip.
   * When the shop-entrance video is ready, drop the three files in public/media and change these names.
   */
  hero: { poster: "/media/pour-poster.webp", webm: "/media/pour.webm", mp4: "/media/pour.mp4" },
  /**
   * The Remotion entrance video that plays inside the arch and carries you into the shop as you scroll.
   * null today: the arch holds the animated Jack. When the video is ready, put the files in public/media
   * and set these three paths. The logo then fades out as the video takes over.
   */
  enter: null as { poster: string; webm: string; mp4: string } | null,
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
  hours: "Wednesday to Monday, 11am to 7pm. Closed on Tuesday.",
  owners: ["Michael", "Tanya"],
};

/**
 * Photos of the shop and the bars, for the About section. Put the compressed files in public/media/photos and they
 * appear. A photo whose file is missing is simply left out. Alt text says what is in the picture and does not name
 * anyone. Only use pictures the shop has agreed to publish, and check the people in them are happy to appear.
 */
export const PHOTOS: { file: string; alt: string }[] = [
  { file: "counter.webp", alt: "Behind a slatted wooden counter with a round Jack O’Beers & Deli sign, a beer pump handle, bottles of beer and wine, and chalkboards" },
  { file: "bottle-filler.webp", alt: "A slatted wooden bar unit with a bottle filling machine and a red parasol on top, on a decked patio" },
  { file: "event-bars.webp", alt: "Two wooden bars with beer taps and round Jack O’Beers & Deli signs, set up outdoors under bunting" },
];

/** Where the shop is online. The Instagram and Google links were supplied by the owner. YouTube is not supplied yet. */
export const LINKS = {
  instagram: "https://www.instagram.com/jack.o.beers/",
  google: "https://maps.app.goo.gl/MegXAVddMbibLx6J6",
  youtube: null as string | null,
};

/**
 * Opening hours. Wednesday to Monday 11am to 7pm came from the shop's own details, and Tuesday closed was
 * confirmed by the owner. They could not be read from the Google listing, so check them against it.
 */
export const HOURS: { day: string; open: string | null }[] = [
  { day: "Monday", open: "11am to 7pm" },
  { day: "Tuesday", open: null },
  { day: "Wednesday", open: "11am to 7pm" },
  { day: "Thursday", open: "11am to 7pm" },
  { day: "Friday", open: "11am to 7pm" },
  { day: "Saturday", open: "11am to 7pm" },
  { day: "Sunday", open: "11am to 7pm" },
];
