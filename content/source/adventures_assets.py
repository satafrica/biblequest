# Image asset records, adventures, store catalogue and achievements.
STYLE = ("Cinematic, painterly realism in the tradition of classical biblical oil paintings with modern film lighting; "
         "ancient Near Eastern setting, historically plausible clothing and architecture; warm golden-hour light with deep navy shadows; "
         "palette of deep navy, antique gold, ivory, emerald and subtle amethyst; dignified adult tone; no text or logos.")
NOTE = "Artistic interpretation. Faces, clothing, colours and composition are imagined; only the event itself is described in Scripture."

NATURE_STYLE = STYLE.replace("ancient Near Eastern setting, historically plausible clothing and architecture; ", "untouched natural world with no architecture; ")

def A(id, desc, ref, prompt, alt, h=900, note=NOTE, style=STYLE):
    return {"id": id, "description": desc, "reference": ref, "prompt": prompt + ". " + style, "alt": alt,
            "path": f"/images/{id}.webp", "height": h, "interpretation_note": note}

ASSETS = [
 A("hero_jerusalem", "Ancient Jerusalem at sunrise from the Mount of Olives", "Psalm 125:2 (setting)", "Wide panoramic view of ancient Jerusalem at sunrise seen from the Mount of Olives, limestone walls and the Second Temple glowing gold, olive trees, a lone traveler with a staff", "Ancient Jerusalem glowing gold at sunrise, seen from an olive grove with a traveller on the path.", 675,
   "Artistic reconstruction of Second Temple-era Jerusalem; architecture is approximate, not an archaeological model."),
 A("creation", "Light breaking over the primordial waters", "Genesis 1:1-5", "The creation of the world: light breaking across dark primordial waters as dry land, plants, sun, moon and stars appear; the world is newly made, with no buildings, ruins, people or human-made objects anywhere", "Rays of light breaking over dark waters as land and plants emerge.", style=NATURE_STYLE),
 A("noah_ark", "The ark after the flood with a rainbow", "Genesis 8-9", "A massive wooden ark resting under a rainbow, animals leaving in pairs, an elderly man giving thanks, a dove", "A large wooden ark on a hillside under a rainbow as animals walk out in pairs.",
   note=NOTE + " The ark's shape is imagined; Genesis 6:15 gives only its dimensions."),
 A("abraham_stars", "Abram looking at the stars", "Genesis 15:5", "An elderly nomadic patriarch outside his tent at night gazing at countless stars", "An old man outside a desert tent gazing up at a sky full of stars."),
 A("joseph_coat", "Joseph in his coat with his brothers", "Genesis 37:3-4", "A young man in a richly coloured coat in a field with flocks, his brothers watching jealously", "A young man in a colourful coat stands in a field while older brothers watch from a distance."),
 A("moses_red_sea", "The parting of the Red Sea", "Exodus 14:21-22", "A leader with a staff raised as the sea parts into walls of water and a multitude crosses", "A leader raises his staff as the sea parts into towering walls and people cross on dry ground."),
 A("david_goliath", "David facing Goliath", "1 Samuel 17", "A young shepherd with a sling facing a towering armoured giant, armies on the hills", "A young shepherd with a sling faces an armoured giant in a valley between two armies."),
 A("solomon_temple", "Dedication of Solomon's temple", "1 Kings 8", "A magnificent stone and cedar temple with bronze pillars, a king dedicating it before a crowd", "A king in royal robes before a grand temple with bronze pillars as offerings smoke."),
 A("elijah_carmel", "Fire on Mount Carmel", "1 Kings 18:36-39", "A prophet beside a stone altar as fire falls from heaven, a crowd recoiling", "Fire falls from a stormy sky onto a stone altar while a prophet stands beside it."),
 A("daniel_lions", "Daniel in the lions' den", "Daniel 6", "A calm older man standing in a stone den among resting lions, light from above", "A calm man in robes stands among resting lions in a dim stone den."),
 A("esther_king", "Esther before King Ahasuerus", "Esther 5:1-2", "A queen in Persian garments approaching a king on a throne, the king extending a golden sceptre", "A queen approaches a Persian king on his throne as he extends a golden sceptre."),
 A("nativity", "The birth of Jesus in Bethlehem", "Luke 2:4-16", "A humble stable at night, a young mother with a newborn in a manger, shepherds kneeling, a bright star", "A mother and newborn in a manger in a stable at night, with shepherds kneeling.",
   note=NOTE + " Luke mentions a manger; the stable setting and star over the shepherds are traditional artistic details."),
 A("sermon_mount", "The Sermon on the Mount", "Matthew 5-7", "A teacher seated on a hillside by the Sea of Galilee teaching a large crowd", "A teacher seated on a green hillside by a lake addresses a large crowd."),
 A("calming_storm", "Jesus calming the storm", "Mark 4:35-41", "A small fishing boat in a violent storm, a calm figure with arm outstretched", "A small boat tossed by waves at night as a calm figure stretches out his arm."),
 A("good_samaritan", "The Good Samaritan", "Luke 10:30-35", "A traveller bandaging a wounded man by a rocky road, a donkey nearby, two figures walking away", "A traveller kneels to bandage a wounded man on a rocky road while two others walk away.",
   note="Illustration of a parable (a story Jesus told), not a historical event."),
 A("prodigal_son", "The return of the prodigal son", "Luke 15:20", "An elderly father running to embrace a ragged returning son on a dirt road", "An elderly father runs to embrace his ragged son on a country road.",
   note="Illustration of a parable (a story Jesus told), not a historical event."),
 A("pentecost", "The day of Pentecost", "Acts 2:1-4", "A group in an upper room, small flames above each head, rushing wind", "Men and women in a room with small flames resting above their heads."),
 A("paul_ship", "Paul's shipwreck", "Acts 27:39-44", "An ancient Roman cargo ship wrecked on rocks near an island in a storm, people swimming to shore", "A Roman ship breaks apart on rocks while passengers swim toward an island beach."),
 A("jonah_fish", "Jonah and the great fish", "Jonah 1:15-17", "A man being swallowed beneath a stormy sea by an enormous fish, a ship above", "Beneath a stormy sea, an enormous fish rises toward a man while a ship tosses above.",
   note=NOTE + " Scripture says 'a great fish' without naming a species."),
 A("empty_tomb", "The empty tomb", "Mark 16:1-6", "A garden rock-cut tomb with the round stone rolled away, women carrying spices", "Women carrying spices approach a rock-cut tomb whose stone has been rolled away."),
]

ADVENTURES = [
 {"id": "ot-journey", "title": "From Eden to Exile", "testament": "OT", "image_id": "creation",
  "summary": "Walk through the Old Testament: creation, the patriarchs, the exodus, the kingdom and the prophets.",
  "chapters": [
   {"id": "ot-1", "title": "In the Beginning", "reference_label": "Genesis 1\u20139", "image_id": "creation", "tags": ["creation", "noah_ark", "noah", "adam", "cain", "enoch"],
    "narrative": "Genesis opens with God creating the heavens and the earth (Genesis 1:1). It tells of the first people in Eden, the first sin, and the flood from which Noah, his family and the animals were saved in the ark (Genesis 6\u20139)."},
   {"id": "ot-2", "title": "The Patriarchs", "reference_label": "Genesis 12\u201350", "image_id": "abraham_stars", "tags": ["abraham_stars", "joseph_coat", "abraham", "jacob", "joseph", "esau", "melchizedek"],
    "narrative": "God called Abram to leave his homeland and promised to make of him a great nation (Genesis 12:1-3). The promise passed to Isaac and Jacob, and Joseph's journey from slavery to leadership brought Jacob's family to Egypt (Genesis 37\u201350)."},
   {"id": "ot-3", "title": "Out of Egypt", "reference_label": "Exodus 1\u201320", "image_id": "moses_red_sea", "tags": ["moses_red_sea", "moses", "miriam", "exodus", "plagues", "wilderness"],
    "narrative": "Generations later Israel was enslaved in Egypt. God called Moses from the burning bush (Exodus 3), brought the people out through the Red Sea (Exodus 14) and gave the Ten Commandments at Sinai (Exodus 20)."},
   {"id": "ot-4", "title": "Into the Land", "reference_label": "Joshua \u2013 Ruth", "image_id": "moses_red_sea", "tags": ["joshua", "rahab", "gideon", "samson", "deborah", "ruth", "boaz", "caleb"],
    "narrative": "Under Joshua, Israel crossed the Jordan and entered Canaan (Joshua 3\u20136). In the time of the judges, leaders such as Deborah, Gideon and Samson rose up, and the book of Ruth shows faithfulness in a difficult age."},
   {"id": "ot-5", "title": "The Kingdom", "reference_label": "1 Samuel \u2013 1 Kings 11", "image_id": "david_goliath", "tags": ["david_goliath", "solomon_temple", "samuel", "saul", "david", "solomon", "hannah"],
    "narrative": "Samuel anointed Saul and then David as king (1 Samuel 10; 16). David defeated Goliath and later reigned in Jerusalem; his son Solomon built the temple (1 Kings 6\u20138)."},
   {"id": "ot-6", "title": "Prophets and Exile", "reference_label": "1 Kings 17 \u2013 Malachi", "image_id": "daniel_lions", "tags": ["elijah_carmel", "daniel_lions", "esther_king", "jonah_fish", "elijah", "elisha", "isaiah", "jeremiah", "nehemiah", "daniel", "esther", "jonah"],
    "narrative": "Prophets such as Elijah, Isaiah and Jeremiah called the people back to God. Judah went into exile in Babylon, where Daniel served; Esther's courage protected her people, and Nehemiah later rebuilt Jerusalem's walls."},
  ]},
 {"id": "nt-journey", "title": "The Way of the Gospel", "testament": "NT", "image_id": "sermon_mount",
  "summary": "Follow the life and teaching of Jesus, the birth of the church and the journeys that carried the message outward.",
  "chapters": [
   {"id": "nt-1", "title": "The Promised Child", "reference_label": "Matthew 1\u20132; Luke 1\u20132", "image_id": "nativity", "tags": ["nativity", "mary", "john_baptist"],
    "narrative": "The angel Gabriel was sent to Mary in Nazareth (Luke 1:26-31). Jesus was born in Bethlehem and laid in a manger (Luke 2:7), and wise men came with gifts (Matthew 2:11)."},
   {"id": "nt-2", "title": "Teacher of Galilee", "reference_label": "Matthew 4\u20137; Mark 4", "image_id": "sermon_mount", "tags": ["sermon_mount", "calming_storm", "ministry", "peter", "matthew", "zacchaeus", "nicodemus"],
    "narrative": "Jesus called fishermen to follow Him (Matthew 4:19), taught the Sermon on the Mount (Matthew 5\u20137) and calmed the storm on the sea of Galilee (Mark 4:39)."},
   {"id": "nt-3", "title": "Parables of the Kingdom", "reference_label": "Luke 10; 15", "image_id": "good_samaritan", "tags": ["good_samaritan", "prodigal_son", "prodigal", "samaritan", "martha"],
    "narrative": "Jesus often taught in parables. The Good Samaritan answers the question \"Who is my neighbour?\" (Luke 10:29-37), and the Prodigal Son pictures a father's welcome for a returning child (Luke 15:11-32)."},
   {"id": "nt-4", "title": "Cross and Empty Tomb", "reference_label": "Matthew 21\u201328; John 11; 20", "image_id": "empty_tomb", "tags": ["empty_tomb", "passion", "resurrection", "lazarus", "judas", "mary_magdalene", "thomas"],
    "narrative": "Jesus entered Jerusalem to cries of \"Hosanna\" (Matthew 21:9), shared the Last Supper, was crucified, and on the first day of the week the tomb was found empty (Mark 16:2-6)."},
   {"id": "nt-5", "title": "The Church Is Born", "reference_label": "Acts 1\u20139", "image_id": "pentecost", "tags": ["pentecost", "church", "stephen", "barnabas", "paul"],
    "narrative": "At Pentecost the Holy Spirit came upon the believers and Peter preached to the crowds (Acts 2). Stephen was martyred, and Saul of Tarsus met the risen Jesus on the road to Damascus (Acts 7\u20139)."},
   {"id": "nt-6", "title": "To the Ends of the Earth", "reference_label": "Acts 13 \u2013 Revelation", "image_id": "paul_ship", "tags": ["paul_ship", "lydia", "timothy", "john_apostle", "Revelation", "Philippians", "Ephesians"],
    "narrative": "Paul carried the message across the Roman world and wrote letters to the churches. Acts ends with Paul in Rome (Acts 28), and the Bible closes with John's vision of a new heaven and a new earth (Revelation 21)."},
  ]},
]

def I(id, name, desc, cat, price, consumable=False, sort=0, image=None, alt=None):
    return {"id": id, "name": name, "description": desc, "category": cat, "price": price, "consumable": consumable, "sort": sort, "image": image, "image_alt": alt}

STORE_ITEMS = [
 I("hint", "Lamp of Insight", "Reveal a helpful hint for one question.", "power_up", 30, True, 1),
 I("eliminate_two", "Winnowing Fan", "Remove two incorrect answers from one question.", "power_up", 40, True, 2),
 I("extra_time", "Hourglass", "Add 15 seconds to a timed Arena question.", "power_up", 25, True, 3),
 I("badge_scroll", "Scroll Keeper", "A badge for faithful readers.", "badge", 150, sort=10),
 I("badge_lamp", "Lamp unto My Feet", "Inspired by Psalm 119:105.", "badge", 200, sort=11),
 I("badge_olive", "Olive Branch", "A sign of peace after the flood (Genesis 8:11).", "badge", 200, sort=12),
 I("badge_dove", "Dove of Peace", "A gentle emblem for peacemakers.", "badge", 250, sort=13),
 I("badge_anchor", "Anchor of Hope", "From Hebrews 6:19.", "badge", 300, sort=14),
 I("badge_shepherd", "Shepherd's Staff", "For those who guide others (Psalm 23).", "badge", 350, sort=15),
 I("badge_crown", "Crown of Wisdom", "A regal badge for seasoned scholars.", "badge", 500, sort=16),
 I("frame_gold", "Antique Gold Frame", "A gilded border for your profile.", "frame", 400, sort=20),
 I("frame_emerald", "Emerald Frame", "A deep green jewelled border.", "frame", 400, sort=21),
 I("frame_amethyst", "Amethyst Frame", "Royal purple, like the high priest's breastplate stones.", "frame", 450, sort=22),
 I("frame_cedar", "Cedar of Lebanon", "Carved-wood border inspired by the temple.", "frame", 600, sort=23),
 I("frame_mosaic", "Jerusalem Mosaic", "A tiled border in gold and navy.", "frame", 800, sort=24),
 I("theme_galilee", "Galilee Waters", "Cool emerald and lake-blue accents across the app.", "theme", 700, sort=30),
 I("theme_temple", "Temple Gold", "Warm gilded accents across the app.", "theme", 900, sort=31),
 I("theme_amethyst", "Royal Amethyst", "Purple and gold accents across the app.", "theme", 700, sort=32),
 I("coll_ot", "Old Testament Gallery", "Unlock a gallery of Old Testament illustrations with notes.", "collection", 1000, sort=40),
 I("coll_nt", "Gospels and Acts Gallery", "Unlock a gallery of New Testament illustrations with notes.", "collection", 1000, sort=41),
 I("card_sling", "Shepherd's Sling Card", "Collectible card: David's sling (1 Samuel 17:40).", "collectible", 120, sort=50),
 I("card_manna", "Pot of Manna Card", "Collectible card: bread from heaven (Exodus 16:15).", "collectible", 120, sort=51),
 I("card_lamp", "Wise Virgins' Lamp Card", "Collectible card: Matthew 25:4.", "collectible", 150, sort=52),
 I("card_mite", "Widow's Mites Card", "Collectible card: Mark 12:42.", "collectible", 150, sort=53),
 I("card_staff", "Rod of Aaron Card", "Collectible card: Numbers 17:8.", "collectible", 180, sort=54),
 I("card_net", "Fisher's Net Card", "Collectible card: Luke 5:6.", "collectible", 180, sort=55),
 I("bonus_expert", "Expert Gauntlet", "Unlock the Expert-level Challenge Arena.", "bonus", 1500, sort=60),
 I("deco_laurel", "Victor's Laurel", "A laurel wreath around your achievements.", "decoration", 300, sort=70),
 I("deco_stars", "Starfield", "A field of stars behind your achievements (Genesis 15:5).", "decoration", 250, sort=71),
]

ACHIEVEMENTS = [
 {"id": "first_light", "name": "First Light", "description": "Answer your first question correctly.", "icon": "sun", "rule": {"type": "correct_total", "gte": 1}},
 {"id": "scholar_25", "name": "Diligent Student", "description": "Answer 25 different questions correctly.", "icon": "scroll", "rule": {"type": "correct_total", "gte": 25}},
 {"id": "scholar_100", "name": "Scribe", "description": "Answer 100 different questions correctly.", "icon": "book", "rule": {"type": "correct_total", "gte": 100}},
 {"id": "scholar_250", "name": "Master of the Scrolls", "description": "Answer 250 different questions correctly.", "icon": "crown", "rule": {"type": "correct_total", "gte": 250}},
 {"id": "levels_1", "name": "First Steps", "description": "Complete your first level.", "icon": "path", "rule": {"type": "levels_completed", "gte": 1}},
 {"id": "levels_10", "name": "Pilgrim", "description": "Complete 10 different levels.", "icon": "path", "rule": {"type": "levels_completed", "gte": 10}},
 {"id": "perfect_1", "name": "Flawless", "description": "Earn your first perfect round.", "icon": "gem", "rule": {"type": "perfect_levels", "gte": 1}},
 {"id": "perfect_10", "name": "Refined Gold", "description": "Earn 10 perfect rounds.", "icon": "gem", "rule": {"type": "perfect_levels", "gte": 10}},
 {"id": "daily_7", "name": "Daily Bread", "description": "Complete 7 daily challenges.", "icon": "bread", "rule": {"type": "daily_total", "gte": 7}},
 {"id": "adventurer", "name": "Adventurer", "description": "Complete a full Bible adventure.", "icon": "map", "rule": {"type": "adventures_completed", "gte": 1}},
 {"id": "picture_4", "name": "Keen Eye", "description": "Complete 4 Picture Quiz levels.", "icon": "eye", "rule": {"type": "mode_levels", "mode": "picture", "gte": 4}},
 {"id": "whoami_4", "name": "Know Their Names", "description": "Complete 4 Who Am I? levels.", "icon": "person", "rule": {"type": "mode_levels", "mode": "whoami", "gte": 4}},
 {"id": "geography_2", "name": "Map Reader", "description": "Complete 2 Geography Explorer levels.", "icon": "map", "rule": {"type": "mode_levels", "mode": "geography", "gte": 2}},
 {"id": "hidden_2", "name": "Sharp Eyes", "description": "Complete 2 Hidden Object levels.", "icon": "eye", "rule": {"type": "mode_levels", "mode": "hidden", "gte": 2}},
 {"id": "wisdom_2", "name": "Wise Counsel", "description": "Complete 2 Wisdom Decisions levels.", "icon": "scroll", "rule": {"type": "mode_levels", "mode": "wisdom", "gte": 2}},
 {"id": "master_1", "name": "Bible Master", "description": "Complete a Bible Master Challenge.", "icon": "crown", "rule": {"type": "mode_levels", "mode": "master", "gte": 1}},
]
