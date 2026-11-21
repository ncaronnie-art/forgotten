/**
 * Blog post data — powers /blog (index) and /blog/<slug> (per-post) pages.
 *
 * Source content lives in /home/team/shared/marketing/blog/*.md (marketing-owned);
 * this module is the site-side representation rendered as JSX.
 * Adding a post = adding one object here.
 */

export interface BlogSection {
  heading: string;
  /** e.g. "Category: Disaster · Year: 1915 · Sources: SS Eastland (Wikipedia)" */
  kicker?: string;
  paragraphs: string[];
  /** optional bullet list (e.g. walking-tour entries) rendered under the paragraphs */
  bullets?: string[];
  /** optional paragraphs rendered after the bullet list */
  paragraphsAfterBullets?: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  /** ISO date shown on the index */
  date: string;
  /** display label, e.g. "Past Shadows Journal · Post 01" */
  postLabel: string;
  /** 1-line excerpt for the /blog index */
  excerpt: string;
  /** <head> meta description */
  metaDescription: string;
  /** italic standfirst under the H1 */
  standfirst: string;
  /** paragraphs before the first section */
  intro: string[];
  sections: BlogSection[];
  whyTitle: string;
  whyParagraphs: string[];
  /** CTA block rendered above the footer */
  ctaTitle: string;
  ctaBody: string;
  /** small italic footnote at the very bottom */
  footnote: string;
}

export const SITE_URL = "https://pastshadows.ctonew.app";

export const blogPosts: BlogPost[] = [
  {
    slug: "what-was-here-before-your-street",
    title: "What Was Here Before Your Street Existed?",
    date: "2026-08-11",
    postLabel: "Past Shadows Journal · Post 01",
    excerpt:
      "Five places from the Past Shadows database — a Trail of Death under Lincoln Avenue, the Murder Castle that became a post office, Dyatlov Pass, and more.",
    metaDescription:
      "Five places from the Past Shadows database: a Trail of Death under Lincoln Avenue, the Murder Castle that became a post office, Dyatlov Pass, and more. The ground doesn't forget. People do.",
    standfirst: "Every place has a shadow. Some shadows are a century old. Some are older than the country.",
    intro: [
      `I spend an unreasonable amount of time thinking about what used to stand where I'm standing. Not in a "haunted house" way — more in a "there are 248 documented crimes, 145 disasters, and 71 unsolved mysteries mapped across the world's cities, and most of them are within walking distance of someone who has no idea" way.`,
      "Here's the thing I keep coming back to: **the ground doesn't forget. People do.**",
      `So I built a map that doesn't. It's called **Past Shadows** — a free web app that plots the dark history of wherever you are: crimes, murders, disasters, unsolved mysteries, executions, riots, cemeteries, and local legends, all pulled from public records, Wikipedia, Wikidata, and OpenStreetMap. Open it anywhere on Earth and it tells you what happened within a few miles.`,
      "But rather than tell you about the app, here are five places from the database that genuinely got me.",
    ],
    sections: [
      {
        heading: "1. Lincoln Avenue, Chicago — a Trail of Death under the pavement",
        kicker: "Category: Historical · Year: 1833 · Source: Treaty of Chicago (Wikipedia)",
        paragraphs: [
          `Long before the coffee shops, Lincoln Square in Chicago was "Little Fort Road" — a Potawatomi trail running from the Chicago River to a military outpost. In 1833, the Treaty of Chicago forced the Potawatomi, Ojibwe, and Odawa peoples to cede their Great Lakes lands — every inch of what's now Lincoln Square — and walk west of the Mississippi.`,
          "Hundreds died on that forced removal. Disease. Starvation. Exposure.",
          `The riverbank where River Park now stands was likely a burial ground. No archaeological survey was ever done before the park was built. Every time I walk through that neighborhood, I think about that: a few thousand people lived here for centuries, and almost nothing of them survives except the land itself.`,
        ],
      },
      {
        heading: "2. A CVS pharmacy on Dearborn Street, Chicago — the ghost of a flapper",
        kicker: "Category: Mystery / Local Legend · Year: 1892 · Sources: Chicago Reader archive",
        paragraphs: [
          "At 632 N. Dearborn stands a CVS. Before that, it was the Excalibur nightclub — one of Chicago's most haunted venues. Before that, a public bathhouse. Before that, a church.",
          `In the 1920s it was a Prohibition speakeasy where gangsters were murdered. Staff and patrons have reported the ghost of a woman in a flapper dress on the upper floors for decades. The building has been a church, a bathhouse, a gangster hangout, a nightclub, and now a pharmacy — with a body count somewhere in that timeline.`,
          "That's the thing about dense urban blocks: they absorb a century of violence and just keep serving coffee.",
        ],
      },
      {
        heading: "3. The Murder Castle that became a post office",
        kicker: "Category: Crime · Year: 1893 · Source: H.H. Holmes (Wikipedia)",
        paragraphs: [
          `H.H. Holmes' "Murder Castle" at 601–603 W. Wrightwood Avenue in Englewood was built specifically for murder during the 1893 World's Fair: soundproof rooms, gas chambers, a basement crematorium, secret passages. Holmes confessed to 27 murders; historians suspect the real number was far higher.`,
          `The building was demolished in 1938. Today the site is a **post office** — a grim punchline, since Holmes defrauded the postal service among his many other crimes.`,
          "If you open Past Shadows in Englewood, that's one of the first markers you'll see. It's real. It's documented. And there's a line of people at the counter every lunch hour.",
        ],
      },
      {
        heading: "4. Dyatlov Pass — nine skiers, no survivors, no consensus",
        kicker: "Category: Mystery · Year: 1959 · Status: Unsolved",
        paragraphs: [
          `February 2, 1959. Nine experienced hikers in the Ural Mountains of Russia. Their tent was found ripped open from *inside*. Their bodies were scattered across the slope — some with injuries that official investigators described as "impossible without extraordinary force."`,
          "Radiation on clothing. A missing tongue. A camera with undeveloped film.",
          "Decades of theories: avalanche. Infrasound. Secret weapons tests. Aliens. The file was reopened in 2019; the mystery remains officially unsolved. If you want a rabbit hole that never bottoms out, this is the one.",
        ],
      },
      {
        heading: "5. Atlanta, 1979–1981 — 28 children, one conviction, endless doubts",
        kicker: "Category: Crime / Mystery · Years: 1979–1981 · Status: Reopened 2019",
        paragraphs: [
          "Between 1979 and 1981, at least 28 Black children and young adults were murdered in Atlanta. Bodies found in rivers, woods, abandoned buildings. Parents kept their kids indoors. Wayne Williams was convicted of two adult murders and linked by fiber evidence to more than 20 others — but he was never tried for any of the child killings. He maintains his innocence.",
          "The case was reopened in 2019. The mothers of the dead children still gather, decades later, still asking who killed their babies and why nobody cared enough to find out.",
          "That's the darkest thing the database surfaced for me: not the unsolved *case*, but the unsolved *accountability*.",
        ],
      },
    ],
    whyTitle: "Why this exists",
    whyParagraphs: [
      `None of this is new information — it's all public record. What's new is that it's **mappable**. You can stand on any corner, open the app, and see what happened within a mile. That changes how you read a city. A quiet street stops being quiet.`,
      `The app currently has **719 curated events across 11 categories worldwide** — from Pompeii to the 2025 New Orleans attack — plus live queries that find more in real time, anywhere on the planet. It's free to use: open it, allow location, see the five nearest events. A Pro tier ($6.99/mo) unlocks unlimited events, the History Reel, narrated Video Stories you can export as MP4s, and **Scan My Area** — which lets you sweep any radius and generate new events from public archives on demand.`,
      `I'll be honest about what it isn't: it's not a crime-avoidance tool and it doesn't rank "safe" vs "unsafe" neighborhoods. It's a history tool with a bias toward the macabre. If you're the kind of person who reads the plaque on the old building instead of walking past it — this is for you.`,
    ],
    ctaTitle: "👉 Try it at your own location",
    ctaBody: "pastshadows.ctonew.app · free to use",
    footnote:
      "All events above are drawn from Past Shadows' curated database, sourced from public records and Wikipedia. Sources linked per event.",
  },
  {
    slug: "dark-history-of-chicago",
    title: "The Dark History of Chicago, Mapped",
    date: "2026-08-11",
    postLabel: "Past Shadows Journal · Post 02",
    excerpt:
      "The deadliest shipwreck on the Great Lakes, the Iroquois Theatre fire, Capone's gang war, and the Tylenol murders — Chicago's documented dark history, mapped.",
    metaDescription:
      "The SS Eastland, the Iroquois Theatre fire, Capone's Chicago, the Tylenol murders, and the Great Fire — Chicago's documented dark history, mapped. 112 curated events in the database.",
    standfirst:
      "The deadliest shipwreck on the Great Lakes happened on the Chicago River. The deadliest single-building fire in American history happened at a matinee. Chicago's shadows aren't hiding — they're on street corners.",
    intro: [
      `Chicago is the densest cluster in the Past Shadows database — **112 curated events** in and around the city, more than any other place on the map. That's not a coincidence: Chicago's history is a century of fire, water, gangland violence, and unsolved crimes, layered on top of itself block after block.`,
      "Here are six entries that show the range — and the places you can still stand today.",
    ],
    sections: [
      {
        heading: "1. The Great Chicago Fire (1871) — the city that burned and rebuilt",
        kicker: "Category: Disaster · Year: 1871 · Source: Great Chicago Fire (Wikipedia)",
        paragraphs: [
          `The fire of October 1871 destroyed 3.3 square miles of the city and left more than 100,000 people homeless. Legend blames Mrs. O'Leary's cow; historians have since floated everything from a meteor shower to a barn fire. What's certain: the city burned for two days, and almost nothing built before 1871 survives above ground. Every old-looking block in Chicago is old-looking on top of 1871. The fire is the reason the city's dark history has a clear "before" and "after."`,
        ],
      },
      {
        heading: "2. The SS Eastland (1915) — the disaster Chicago forgot",
        kicker: "Category: Disaster · Year: 1915 · Sources: SS Eastland (Wikipedia), Eastland mass grave at Rosehill",
        paragraphs: [
          `On July 24, 1915, the SS Eastland — a passenger ship overloaded for a Western Electric company picnic — rolled over at its dock on the Chicago River, in 20 feet of water. **844 people drowned**, mostly factory workers and their families. It remains the deadliest disaster in Chicago history, and one of the deadliest in Great Lakes history. The bodies were laid out along the Clark Street Bridge for days; morgues were overwhelmed. Many of the unidentified dead were buried in a mass grave at Rosehill Cemetery with a single granite marker and no names.`,
          `Here's the part that got me: the Eastland killed more people than the Great Chicago Fire did — and most Chicagoans have never heard of it, because it happened the same day as a major trolley accident that dominated the next day's headlines. The ship rolled over in water barely 20 feet deep — shallower than the ship was tall — in full view of the city. The site, near Navy Pier, is now a marina and a tourist walk. The disaster is on the bottom of the city's memory, largely unremembered.`,
        ],
      },
      {
        heading: "3. The Iroquois Theatre fire (1903) — 602 dead at a holiday matinee",
        kicker: "Category: Disaster · Year: 1903 · Sources: Iroquois Theatre fire (Wikipedia)",
        paragraphs: [
          `On December 30, 1903, a packed matinee of *Mr. Blue Beard* at the Iroquois Theatre on Randolph Street — 1,700 people, most of them women and children on holiday — turned deadly when a spotlight ignited scenery. Panic, locked exits, and no fire safety systems turned it into the deadliest single-building fire in American history: **602 dead**, many burned beyond recognition. The unclaimed and unidentified were buried in a trench at Rosehill, coffins stacked three deep, in a plot that lay unmarked for more than a century.`,
          "The theater building itself was renovated and renamed; the site is now part of a Loop block most people rush through on the way to the El. A century of unvisited graves is the quietest kind of dark history there is.",
        ],
      },
      {
        heading: "4. Capone's Chicago — the three blocks that ended the gang war (1926–1929)",
        kicker:
          "Category: Crime · Years: 1926–1931 · Sources: St. Valentine's Day Massacre (Wikipedia), Lexington Hotel (Wikipedia)",
        paragraphs: ["The Prohibition gang war left a trail you can still walk in a single afternoon."],
        bullets: [
          `**Holy Name Cathedral (735 N. State)** — in October 1926, North Side boss Hymie Weiss was gunned down by Capone's men as he walked from the cathedral. The **bullet hole is still in the limestone pillar** at the entrance, never patched — an unintentional memorial.`,
          `**The Lexington Hotel (2135 S. Michigan)** — Capone's headquarters from 1928 to 1931, where the massacre was planned. Fifth floor, bulletproof doors, escape routes. Now low-income housing, with enduring rumors of tunnels and buried money.`,
          `**2122 N. Clark Street** — the garage where, on February 14, 1929, seven North Side Gang members were lined up and executed by men in police uniforms who weren't police. The garage was demolished in 1967; a senior center stands there now.`,
          `**Union Station (basement)** — where the hitmen gathered in a speakeasy before the massacre. Two years later, a ticket clerk was found murdered in the basement — believed to be a witness Capone's people eliminated.`,
        ],
        paragraphsAfterBullets: [
          "The most famous morning in American gangster history was planned in a train station basement, ordered from a hotel on Michigan Avenue, and carried out in a garage in Lincoln Park — all of it still standing, all of it ordinary now.",
        ],
      },
      {
        heading: "5. Marshall Field's and the Drake — the unsolved deaths on State Street (1937, 1924)",
        kicker: "Category: Mystery / Death · Years: 1924–1937 · Sources: Drake Hotel (Wikipedia)",
        paragraphs: [
          "Downtown Chicago's most elegant buildings have body counts.",
          `In **1937**, a female employee was found strangled in the stockroom of **Marshall Field's** department store on State Street. The case was never solved. Three other suspicious deaths occurred at the store between 1930 and 1950, including an elevator plunge. The store has changed hands and names; the building still anchors the Loop.`,
          `Six blocks north, the **Drake Hotel** (140 E. Walton) hosted a 1924 murder-suicide — a socialite killed her lover in Room 1505 before turning the gun on herself. Guests have reported a woman brushing her hair in the mirror for a century; staff call her the "Lady in Gold." The room is still bookable.`,
        ],
      },
      {
        heading: "6. The Tylenol murders (1982) — the case that changed every bottle in America",
        kicker: "Category: Crime / Unsolved · Year: 1982 · Source: Chicago Tylenol murders (Wikipedia)",
        paragraphs: [
          `In the fall of 1982, seven people in the Chicago area died after taking Extra-Strength Tylenol capsules laced with cyanide. The poison was traced to bottles that had been opened, laced, and resealed on store shelves — including bottles traced to the Maxwell Street Market's bootleg supply chain. The killer was never identified. The case is the reason every medicine bottle in the country now has a tamper-evident seal, and the reason "product tampering" is a federal crime. Seven ordinary people took a headache pill and died; nobody was ever held accountable.`,
        ],
      },
      {
        heading: "The rest of the map",
        paragraphs: [
          `Those six barely scratch it. The same database has the **Wingfoot Air Express** — a dirigible that crashed through the skylight of a Loop bank in 1919, killing 13 — the **1973 FALN bombing** of the Chicago Board of Trade, the **1990s gang wars** that turned South and West Side blocks into free-fire zones, and the haunted Congress Plaza Hotel where Capone held meetings. Open the map anywhere in the city and it fills in.`,
        ],
      },
    ],
    whyTitle: "Why this exists",
    whyParagraphs: [
      `None of this is new information — it's all public record. What's new is that it's **mappable**: stand on the Clark Street Bridge, or outside the Lexington, or at 2122 N. Clark, and Past Shadows tells you what happened within a mile.`,
      `And to be honest about what it isn't: it's not a crime-avoidance tool, and it doesn't rank "safe" vs "unsafe" neighborhoods. It's a history tool with a bias toward the macabre, built from **719 curated events across 11 categories worldwide** plus live queries that find more in real time. Chicago alone has 112 curated events — the densest cluster in the database.`,
    ],
    ctaTitle: "👉 Open the map in Chicago",
    ctaBody: "pastshadows.ctonew.app · free, no signup needed to see the five nearest events",
    footnote:
      "All events above are drawn from Past Shadows' curated database, sourced from public records and Wikipedia. Sources linked per event.",
  },
  {
    slug: "dark-history-of-dallas",
    title: "The Dark History of Dallas, Mapped",
    date: "2026-08-11",
    postLabel: "Past Shadows Journal · Post 03",
    excerpt:
      "Dealey Plaza, Braniff Flight 542, 43 hangings at the old county jail, and the Lady of White Rock Lake — Dallas' documented dark history, mapped.",
    metaDescription:
      "Dealey Plaza, Braniff Flight 542, 43 hangings at the old county jail, a lynching at Main & Akard, and the Lady of White Rock Lake — Dallas' documented dark history, mapped.",
    standfirst:
      "Dealey Plaza, a haunted hotel, a lake with a ghost, and 43 hangings at the old county jail — Dallas keeps its dark past on street corners you walk every day.",
    intro: [
      `Dallas is a city of gleaming towers, professional sports, and barbecue — and, under all of it, one of the densest dark-history maps in Texas. When you open **Past Shadows** downtown, the markers come up fast: assassinations, air crashes, lynching, gang wars, hangings, and more ghost stories than a ghost tour could fit in a weekend.`,
      "Here are six entries from the database that stopped me, in roughly the order you can walk them.",
    ],
    sections: [
      {
        heading: "1. Dealey Plaza — the most investigated crime scene in America (1963)",
        kicker: "Category: Crime / Mystery · Year: 1963 · Sources: Dealey Plaza (Wikipedia), Dallas News ghost stories",
        paragraphs: [
          `On November 22, 1963, President John F. Kennedy was shot as his motorcade passed the Texas School Book Depository. It remains the most investigated murder in U.S. history — the Warren Commission, the House Select Committee, decades of conspiracy theories, a grassy knoll that still draws people searching for answers. The plaza is a National Historic Landmark now, but it's also one of Dallas's most-reported haunted locations: visitors describe a man in a suit on the knoll and a shadow in the sixth-floor window. Whatever you believe about what happened, the site itself has never stopped being a crime scene in the public imagination.`,
        ],
      },
      {
        heading: "2. Braniff Flight 542 — the crash that left no monument (1959)",
        kicker: "Category: Disaster · Year: 1959 · Source: Braniff Flight 542 (Wikipedia)",
        paragraphs: [
          `On September 15, 1959, a Lockheed Electra disintegrated in mid-air shortly after takeoff from Love Field. All 34 people on board died. The cause was a manufacturing defect in the wings — a structural failure, not pilot error. There's no memorial at Love Field for it; the flight is mostly a footnote to the city's aviation history now. The database notes that Runway 13 has its own quiet legend: the ghost of a flight attendant who died that day. The crash itself is the part that matters — 34 people, gone over a suburb in a few seconds, remembered mostly in an accident report.`,
        ],
      },
      {
        heading: "3. The Old Dallas County Jail — 43 hangings, now a restaurant (1915–1934)",
        kicker: "Category: Mystery / Execution · Years: 1915–1934 · Source: Dallas News",
        paragraphs: [
          `At 1500 Main Street stands a building that was the site of 43 executions by hanging between 1915 and 1934. The most infamous was "Big John" — a convicted murderer whose hanging went wrong when the trap door failed, leaving him to die slowly while the crowd watched. The building is now a restaurant. You can sit where gallows once stood and order lunch. That's the thing about dense downtown blocks: they absorb a century of state violence and just keep serving tables.`,
        ],
      },
      {
        heading: "4. The Adolphus and White Rock Lake — the city's two most famous hauntings",
        kicker:
          "Category: Mystery / Local Legend · Sources: Adolphus Hotel (Wikipedia), The legend of the Lady of White Rock Lake (Dallas News)",
        paragraphs: [
          `The **Adolphus Hotel** (1321 Commerce, opened 1912) is widely called Dallas's most haunted building. The ghost of a woman in a 1920s flapper dress reportedly dances in the ballroom; Room 704 has its own resident — a businessman who died of a heart attack in 1935. Guests report belongings moving and phantom elevator music at 3 a.m.`,
          `Ten minutes east, **White Rock Lake** has the city's most famous ghost story: the Lady of the Lake, a woman in a white dress who appears to stranded motorists, asks for a ride home, and vanishes from the back seat. The legend traces to a drowning in the 1950s that was never fully resolved. Whether or not you believe either story, they're both old enough to have been told for decades — which is its own kind of documented history.`,
        ],
      },
      {
        heading: "5. Main & Akard, 1911 — the darkest entry in the Dallas dataset",
        kicker: "Category: Historical / War & Conflict · Year: 1911 · Source: Dallas News history archive",
        paragraphs: [
          "I'll be straight with you about the entry that got me most, because it isn't a mystery and it isn't a ghost story.",
          `In 1911, a Black man named Allen Brooks was accused of a crime, dragged from the county courthouse by a mob, and lynched from a telephone pole at the corner of Main and Akard Streets — in front of a crowd of roughly 5,000 people. Photographs were taken with the body. Nobody was ever prosecuted.`,
          `The intersection is still there. It's a busy downtown corner with no marker, no memorial, nothing to tell you what happened there. The database lists it as one entry among hundreds; it deserves to be read differently. The darkest thing the Dallas map surfaces isn't the unsolved case — it's the unmarked atrocity, the accountability gap that never closed.`,
        ],
      },
      {
        heading: "6. What came before — the Trinity River (1841) and Deep Ellum (1970s)",
        kicker:
          "Category: War & Conflict / Crime · Years: 1841 / 1975–1985 · Sources: Battle of the Trinity (Dallas Historical Society), Dallas News Deep Ellum history",
        paragraphs: [
          `Two more entries that frame the map. In 1841, near the convergence of the Trinity River's forks (today the Dallas Zoo area), a group of Republic of Texas settlers was attacked by Comanche warriors; twelve settlers were killed, and settlement of the area was delayed for years. And in the 1970s, Deep Ellum — now a polished arts district — was the epicenter of Dallas's drug trade, with at least 30 murders linked to trafficking on Elm Street between 1975 and 1985. Both are ordinary places now. Both are part of the ground under them.`,
        ],
      },
    ],
    whyTitle: "Why this exists",
    whyParagraphs: [
      `None of this is new information — it's all public record, and most of it has a Wikipedia page or a news archive behind it. What's new is that it's **mappable**. You can stand at Main & Akard, or outside the Old Jail, or on the Dealey Plaza knoll, and the app tells you what happened within a mile.`,
      `To be clear about what Past Shadows is and isn't: it's not a crime-avoidance tool, and it doesn't rank "safe" vs "unsafe" neighborhoods. It's a history tool with a bias toward the macabre, built from **719 curated events across 11 categories worldwide** plus live queries that find more in real time. Dallas alone has 26 curated events — and the live API queries surface more on the spot.`,
    ],
    ctaTitle: "👉 Open the map in Dallas",
    ctaBody: "pastshadows.ctonew.app · free, no signup needed to see the five nearest events",
    footnote:
      "All events above are drawn from Past Shadows' curated database, sourced from public records, Wikipedia, and regional news archives. Sources linked per event.",
  },
  {
    slug: "dark-history-of-new-orleans",
    title: "The Dark History of New Orleans, Mapped",
    date: "2026-08-11",
    postLabel: "Past Shadows Journal · Post 04",
    excerpt:
      "Marie Laveau's tomb, the Axeman, the UpStairs Lounge fire, and the Great Fire of 1788 — New Orleans' documented dark history, mapped.",
    metaDescription:
      "Marie Laveau's tomb, the Axeman, the UpStairs Lounge fire, the Great Fire of 1788, and yellow fever — New Orleans' documented dark history, mapped.",
    standfirst:
      "Voodoo queens, an axe-wielding phantom, a city rebuilt over fire and fever — New Orleans' famous charm has a documented shadow side.",
    intro: [
      `New Orleans is the only American city where the dark history is a tourist attraction and the residents will argue about the details. The French Quarter's charm is built on centuries of fire, yellow fever, voodoo, and violence — and almost all of it is documented. Open **Past Shadows** anywhere in the city and the map fills in: the oldest cemetery in the city, a serial killer who wrote to the newspapers, the deadliest fire in New Orleans history, and one entry from January 2025 that is still raw.`,
      "Here are six entries from the database.",
    ],
    sections: [
      {
        heading: "1. St. Louis Cemetery No. 1 — the most visited grave in America (1789)",
        kicker: "Category: Cemetery / Local Legend · Year: 1789 · Source: St. Louis Cemetery No. 1 (Wikipedia)",
        paragraphs: [
          `New Orleans' oldest cemetery is the resting place of Marie Laveau, the city's legendary voodoo queen — and her tomb is the most visited grave site in America. The ritual is famous: knock three times, turn around three times, make a wish. Visitors have left thousands of "X" marks on the tomb over the years (the cemetery now discourages it; the marks damage the plaster). The cemetery itself has survived vandalism, grave robbing, and a century of supernatural reports — above-ground tombs arranged like a small city of the dead, the setting for *Interview with the Vampire*. Whether you read it as faith, folklore, or tourism, it's the densest block of documented legend in the city.`,
        ],
      },
      {
        heading: "2. The Axeman of New Orleans — a killer who wrote to the papers (1918–1919)",
        kicker: "Category: Mystery / Unsolved · Years: 1918–1919 · Source: Axeman of New Orleans (Wikipedia)",
        paragraphs: [
          `Between May 1918 and October 1919, an unidentified killer murdered at least six Italian-American grocers and their families with an axe, breaking in through door panels at night and escaping without a trace. He was never caught. What makes the case immortal is the letter he sent to the newspapers in March 1919, promising to kill again on a specific night — but sparing any home where jazz was playing. The city threw a jazz party that night. His last known victim was found on Esplanade Avenue on March 10, 1919. The Axeman became the template for every "phantom killer" story since — and the case is still officially open.`,
        ],
      },
      {
        heading: "3. The UpStairs Lounge — the fire the city looked away from (1973)",
        kicker: "Category: Crime / Terrorism · Year: 1973 · Source: UpStairs Lounge arson attack (Wikipedia)",
        paragraphs: [
          `On June 24, 1973, an arsonist set fire to a gay bar at 141 Chartres Street. Thirty-two people died — trapped on the second floor, some burning at the windows. It was the deadliest attack on a gay club in U.S. history until Pulse in 2016. And for years, the city largely looked away: the fire was never prosecuted as a hate crime, the victims were not named in the press for days, and families were left to bury their children in silence.`,
          "The site is a quiet part of the Quarter now. There's a small memorial; there should be a larger one. This is the entry in the database that matters most, because the atrocity isn't the fire — it's the neglect that followed it.",
        ],
      },
      {
        heading: "4. The Great Fire of 1788 — the disaster that built the French Quarter",
        kicker: "Category: Disaster · Year: 1788 · Source: Great New Orleans Fire (1788) (Wikipedia)",
        paragraphs: [
          `On Good Friday, March 21, 1788, a fire started at the home of a Spanish military treasurer and raged for five hours. When it was over, 856 of the city's roughly 1,100 buildings were gone — more than three-quarters of New Orleans. The Spanish administration rebuilt the city in brick, with balconies and courtyards, and that rebuilding is exactly why the French Quarter looks the way it does today. Every time you walk past a wrought-iron balcony in the Vieux Carré, you're walking through the aftermath of an 18th-century catastrophe that nearly erased the city.`,
        ],
      },
      {
        heading: "5. The Old Ursuline Convent — fever, refuge, and the oldest building in the Mississippi Valley (1745)",
        kicker: "Category: Death / Historical · Year: 1745 (epidemic 1793) · Source: Old Ursuline Convent (Wikipedia)",
        paragraphs: [
          `At 1100 Chartres Street stands the oldest building in the Mississippi Valley. During the 1793 yellow fever epidemic — which killed roughly 10% of the city — the convent became a refuge, and hundreds died on its grounds. The convent's own history includes a nun reportedly murdered there in 1850, and visitors still report footsteps in the halls. It's a building that quietly contains three centuries of the city's hardest years: disease, death, and the faith that carried people through both.`,
        ],
      },
      {
        heading: "6. Bourbon Street, 2025 — the newest entry",
        kicker: "Category: Crime / Terrorism · Year: 2025 · Source: 2025 New Orleans truck attack (Wikipedia)",
        paragraphs: [
          `On January 1, 2025, a man drove a pickup truck into a crowd on Bourbon Street during New Year celebrations, killing fourteen people and injuring dozens more before being killed by police. It is the most recent entry in the New Orleans database — and a reminder that "dark history" isn't only a thing of the past. The map has entries from 1788 and 1919 and 1973; it also has 2025. The ground doesn't only hold old shadows.`,
        ],
      },
    ],
    whyTitle: "Why this exists",
    whyParagraphs: [
      `Every entry above is public record. What's new is that it's **mappable** — stand on any corner in the Quarter and Past Shadows tells you what happened within a mile, from the Axeman's last kill on Esplanade to the fire that built the balconies you're looking at.`,
      `And to be honest about what it isn't: it's not a crime-avoidance tool, and it doesn't rank "safe" vs "unsafe" neighborhoods. It's a history tool with a bias toward the macabre, built from **719 curated events across 11 categories worldwide** plus live queries that surface more in real time. New Orleans has its own dense cluster — cemeteries, unsolved cases, disasters, and legends all mapped to their exact coordinates.`,
    ],
    ctaTitle: "👉 Open the map in New Orleans",
    ctaBody: "pastshadows.ctonew.app · free, no signup needed to see the five nearest events",
    footnote:
      "All events above are drawn from Past Shadows' curated database, sourced from public records and Wikipedia. Sources linked per event.",
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
