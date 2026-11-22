# Hidden Object Adventure: objects the player finds by tapping the existing reviewed illustrations.
# Each scene lists its objects. Boxes are [x, y, width, height] in percent of the image.
# An object may have several boxes (any of them counts). Every object is tied to a KJV passage
# that mentions it (checked by the build through 'keywords').
# (key, prompt, reference, keywords, explanation, difficulty, boxes)
HIDDEN = {
 "noah_ark": [
  ("dove", "Find the dove that Noah sent out.", "Genesis 8:11", ["dove"], "The dove came back to Noah with an olive leaf, so Noah knew the waters were abated (Genesis 8:11).", 2, [[68, 1, 11, 15]]),
  ("bow", "Find the bow God set in the cloud.", "Genesis 9:13", ["bow in the cloud"], "God set His bow in the cloud as a token of His covenant with the earth (Genesis 9:13).", 1, [[44, 0, 32, 34]]),
  ("ark", "Find the ark.", "Genesis 8:4", ["ark rested"], "The ark rested upon the mountains of Ararat (Genesis 8:4).", 1, [[4, 0, 40, 46]]),
  ("beasts", "Find the elephants going forth out of the ark.", "Genesis 8:19", ["went forth out of the ark"], "Every beast, creeping thing and fowl went forth out of the ark after their kinds (Genesis 8:19).", 3, [[43, 33, 18, 23]]),
 ],
 "david_goliath": [
  ("sling", "Find David's sling.", "1 Samuel 17:40", ["sling"], "David took five smooth stones and had his sling in his hand (1 Samuel 17:40).", 3, [[35, 51, 8, 22]]),
  ("spear", "Find Goliath's spear.", "1 Samuel 17:7", ["spear"], "The staff of Goliath's spear was like a weaver's beam (1 Samuel 17:7).", 2, [[50, 0, 7, 84]]),
  ("helmet", "Find Goliath's helmet of brass.", "1 Samuel 17:5", ["helmet of brass"], "Goliath had an helmet of brass upon his head (1 Samuel 17:5).", 3, [[59, 1, 9, 11]]),
  ("greaves", "Find the greaves of brass on Goliath's legs.", "1 Samuel 17:6", ["greaves of brass"], "He had greaves of brass upon his legs (1 Samuel 17:6).", 2, [[58, 53, 22, 30]]),
 ],
 "nativity": [
  ("manger", "Find the manger.", "Luke 2:7", ["manger"], "Mary wrapped her firstborn son in swaddling clothes and laid him in a manger (Luke 2:7).", 1, [[26, 56, 42, 22]]),
  ("babe", "Find the babe wrapped in swaddling clothes.", "Luke 2:12", ["swaddling clothes"], "The angel told the shepherds they would find the babe wrapped in swaddling clothes, lying in a manger (Luke 2:12).", 1, [[44, 47, 15, 15]]),
  ("star", "Find the star.", "Matthew 2:9", ["star"], "The star went before the wise men till it stood over where the young child was (Matthew 2:9).", 2, [[63, 2, 10, 12]]),
  ("flock", "Find a sheep from the shepherds' flock.", "Luke 2:8", ["flock"], "Shepherds were keeping watch over their flock by night (Luke 2:8).", 2, [[16, 76, 23, 19]]),
  ("bethlehem", "Find the town of Bethlehem.", "Luke 2:4", ["Bethlehem"], "Joseph went up to the city of David, which is called Bethlehem (Luke 2:4).", 3, [[55, 13, 42, 24]]),
 ],
 "moses_red_sea": [
  ("rod", "Find the rod Moses lifted up.", "Exodus 14:16", ["lift thou up thy rod"], "God told Moses, \u201clift thou up thy rod, and stretch out thine hand over the sea\u201d (Exodus 14:16).", 2, [[21, 0, 10, 44]]),
  ("wall", "Find a wall of water.", "Exodus 14:22", ["wall"], "The waters were a wall unto them on their right hand, and on their left (Exodus 14:22).", 1, [[57, 0, 43, 44]]),
  ("flocks", "Find a sheep from the flocks that left Egypt.", "Exodus 12:38", ["flocks"], "Israel left Egypt with flocks, and herds, even very much cattle (Exodus 12:38).", 2, [[49, 66, 11, 21]]),
  ("moses", "Find Moses stretching out his hand over the sea.", "Exodus 14:21", ["stretched out his hand"], "Moses stretched out his hand over the sea, and the LORD caused the sea to go back (Exodus 14:21).", 1, [[16, 12, 32, 70]]),
 ],
 "elijah_carmel": [
  ("fire", "Find the fire of the LORD falling.", "1 Kings 18:38", ["fire of the LORD fell"], "The fire of the LORD fell and consumed the burnt sacrifice, the wood, the stones and the dust (1 Kings 18:38).", 1, [[42, 0, 24, 44]]),
  ("altar", "Find the altar of twelve stones.", "1 Kings 18:31", ["twelve stones"], "Elijah took twelve stones, according to the tribes of Israel, and built an altar (1 Kings 18:31-32).", 1, [[34, 47, 38, 32]]),
  ("wood", "Find the wood laid on the altar.", "1 Kings 18:33", ["wood"], "Elijah put the wood in order and laid the bullock on the wood (1 Kings 18:33).", 3, [[40, 39, 28, 10]]),
  ("elijah", "Find Elijah praying beside the altar.", "1 Kings 18:36", ["Elijah the prophet came near"], "At the time of the evening sacrifice, Elijah the prophet came near and prayed (1 Kings 18:36).", 2, [[18, 8, 26, 72]]),
 ],
 "daniel_lions": [
  ("daniel", "Find Daniel.", "Daniel 6:16", ["den of lions"], "Daniel was brought and cast into the den of lions (Daniel 6:16).", 1, [[28, 4, 23, 88]]),
  ("lion", "Find the lion with the great mane.", "Daniel 6:22", ["lions' mouths"], "God sent His angel and shut the lions' mouths (Daniel 6:22).", 1, [[54, 42, 46, 38]]),
  ("mouth", "Find the opening at the top of the den.", "Daniel 6:17", ["mouth of the den"], "A stone was laid upon the mouth of the den and sealed with the king's signet (Daniel 6:17).", 3, [[46, 0, 27, 10]]),
 ],
 "esther_king": [
  ("sceptre", "Find the golden sceptre.", "Esther 5:2", ["golden sceptre"], "The king held out to Esther the golden sceptre that was in his hand (Esther 5:2).", 1, [[45, 21, 21, 27]]),
  ("esther", "Find Queen Esther in her royal apparel.", "Esther 5:1", ["royal apparel"], "On the third day Esther put on her royal apparel and stood in the inner court (Esther 5:1).", 1, [[0, 5, 32, 95]]),
  ("throne", "Find the king's royal throne.", "Esther 5:1", ["royal throne"], "The king sat upon his royal throne in the royal house (Esther 5:1).", 2, [[81, 48, 16, 48]]),
 ],
 "jonah_fish": [
  ("fish", "Find the great fish.", "Jonah 1:17", ["great fish"], "The LORD had prepared a great fish to swallow up Jonah (Jonah 1:17).", 1, [[0, 25, 59, 72]]),
  ("ship", "Find the ship going to Tarshish.", "Jonah 1:3", ["ship"], "Jonah found a ship going to Tarshish and went down into it (Jonah 1:3).", 1, [[56, 0, 35, 23]]),
  ("mariners", "Find the mariners on the ship.", "Jonah 1:5", ["mariners"], "The mariners were afraid, and cried every man unto his god (Jonah 1:5).", 3, [[69, 3, 17, 12]]),
  ("jonah", "Find Jonah, cast forth into the sea.", "Jonah 1:15", ["cast him forth into the sea"], "They took up Jonah and cast him forth into the sea, and the sea ceased from her raging (Jonah 1:15).", 1, [[32, 43, 42, 44]]),
 ],
 "good_samaritan": [
  ("beast", "Find the Samaritan's own beast.", "Luke 10:34", ["his own beast"], "The Samaritan set the wounded man on his own beast and brought him to an inn (Luke 10:34).", 1, [[0, 3, 31, 47]]),
  ("oil", "Find the jar of oil and wine.", "Luke 10:34", ["oil and wine"], "He bound up his wounds, pouring in oil and wine (Luke 10:34).", 3, [[19, 65, 8, 15]]),
  ("wounds", "Find the wounds being bound up.", "Luke 10:34", ["bound up his wounds"], "The Samaritan went to him, and bound up his wounds (Luke 10:34).", 2, [[49, 61, 12, 20]]),
  ("passed", "Find the men who passed by on the other side.", "Luke 10:31", ["passed by on the other side"], "A priest saw him and passed by on the other side; a Levite did the same (Luke 10:31-32).", 2, [[77, 15, 19, 32]]),
 ],
 "calming_storm": [
  ("waves", "Find the waves beating into the ship.", "Mark 4:37", ["waves beat into the ship"], "There arose a great storm of wind, and the waves beat into the ship (Mark 4:37).", 1, [[0, 48, 23, 50]]),
  ("jesus", "Find Jesus rebuking the wind.", "Mark 4:39", ["rebuked the wind"], "He arose, and rebuked the wind, and said unto the sea, Peace, be still (Mark 4:39).", 1, [[45, 9, 36, 77]]),
  ("ship", "Find the ship the disciples were sailing.", "Mark 4:36", ["ship"], "They took him even as he was in the ship (Mark 4:36).", 2, [[22, 72, 78, 28]]),
 ],
 "prodigal_son": [
  ("father", "Find the father running to his son.", "Luke 15:20", ["ran"], "When he was yet a great way off, his father saw him, had compassion, and ran (Luke 15:20).", 1, [[15, 9, 49, 82]]),
  ("son", "Find the son returning home.", "Luke 15:21", ["Father, I have sinned"], "The son said, \u201cFather, I have sinned against heaven, and in thy sight\u201d (Luke 15:21).", 1, [[56, 3, 35, 96]]),
  ("servants", "Find the servants watching.", "Luke 15:22", ["servants"], "The father said to his servants, Bring forth the best robe, and put it on him (Luke 15:22).", 2, [[2, 10, 23, 54]]),
  ("feet", "Find the son's bare feet that would soon get shoes.", "Luke 15:22", ["shoes on his feet"], "The father ordered a ring on his hand and shoes on his feet (Luke 15:22).", 3, [[70, 72, 14, 27]]),
 ],
 "pentecost": [
  ("tongues", "Find one of the cloven tongues like as of fire.", "Acts 2:3", ["cloven tongues like as of fire"], "There appeared unto them cloven tongues like as of fire, and it sat upon each of them (Acts 2:3).", 2,
   [[15, 0, 5, 7], [4, 10, 4, 7], [12, 18, 5, 7], [30, 12, 5, 8], [41, 6, 5, 8], [46, 18, 5, 7], [55, 14, 5, 8], [64, 28, 5, 7], [78, 23, 5, 7], [87, 23, 7, 7]]),
  ("jerusalem", "Find the city of Jerusalem outside.", "Acts 2:5", ["Jerusalem"], "There were dwelling at Jerusalem Jews, devout men, out of every nation under heaven (Acts 2:5).", 3, [[89, 3, 11, 30]]),
 ],
 "paul_ship": [
  ("ship", "Find the ship breaking apart.", "Acts 27:41", ["hinder part was broken"], "The forepart stuck fast, and the hinder part was broken with the violence of the waves (Acts 27:41).", 1, [[0, 0, 58, 52]]),
  ("boards", "Find the broken boards in the water.", "Acts 27:44", ["boards"], "The rest escaped, some on boards and some on broken pieces of the ship (Acts 27:44).", 2, [[0, 77, 56, 22]]),
  ("land", "Find the people who escaped safe to land.", "Acts 27:44", ["escaped all safe to land"], "And so it came to pass, that they escaped all safe to land (Acts 27:44).", 2, [[72, 24, 28, 24]]),
 ],
 "empty_tomb": [
  ("stone", "Find the stone that was rolled away.", "Mark 16:4", ["stone was rolled away"], "When they looked, they saw that the stone was rolled away: for it was very great (Mark 16:4).", 1, [[83, 3, 17, 72]]),
  ("spices", "Find the sweet spices the women brought.", "Mark 16:1", ["sweet spices"], "The women had bought sweet spices, that they might come and anoint him (Mark 16:1).", 2, [[42, 41, 7, 14], [19, 39, 6, 12], [7, 38, 4, 10]]),
  ("linen", "Find the linen clothes laid by themselves.", "Luke 24:12", ["linen clothes laid by themselves"], "Peter beheld the linen clothes laid by themselves (Luke 24:12).", 2, [[70, 51, 16, 21]]),
  ("sun", "Find the rising sun.", "Mark 16:2", ["rising of the sun"], "Very early on the first day of the week they came to the sepulchre at the rising of the sun (Mark 16:2).", 3, [[10, 11, 8, 10]]),
 ],
 "solomon_temple": [
  ("solomon", "Find Solomon spreading forth his hands toward heaven.", "1 Kings 8:22", ["spread forth his hands toward heaven"], "Solomon stood before the altar and spread forth his hands toward heaven (1 Kings 8:22).", 1, [[35, 19, 26, 56]]),
  ("candlestick", "Find a candlestick of gold.", "1 Kings 7:49", ["candlesticks of pure gold"], "Solomon made the candlesticks of pure gold for the house (1 Kings 7:49).", 2, [[26, 19, 10, 17], [33, 44, 5, 8]]),
  ("pillars", "Find one of the great pillars.", "1 Kings 7:21", ["pillars"], "Solomon set up the pillars in the porch of the temple, Jachin and Boaz (1 Kings 7:21).", 1, [[15, 0, 12, 40], [49, 0, 10, 50], [64, 0, 10, 60]]),
  ("cherubims", "Find a carved winged cherub.", "1 Kings 6:29", ["carved figures of cherubims"], "He carved all the walls of the house round about with carved figures of cherubims (1 Kings 6:29).", 3, [[16, 9, 11, 21], [67, 24, 8, 16]]),
 ],
 "abraham_stars": [
  ("stars", "Find the stars Abram was told to number.", "Genesis 15:5", ["tell the stars"], "God said, Look now toward heaven, and tell the stars, if thou be able to number them (Genesis 15:5).", 1, [[44, 0, 56, 36]]),
  ("tent", "Find the tent door.", "Genesis 18:1", ["tent door"], "Abraham sat in the tent door in the heat of the day (Genesis 18:1).", 1, [[0, 5, 23, 85]]),
  ("camels", "Find the camels.", "Genesis 12:16", ["camels"], "Abram had sheep, oxen, he asses, menservants, maidservants, she asses and camels (Genesis 12:16).", 2, [[55, 46, 26, 34], [80, 57, 11, 17]]),
 ],
 "joseph_coat": [
  ("coat", "Find Joseph's coat.", "Genesis 37:3", ["coat of many colours"], "Israel made Joseph a coat of many colours (Genesis 37:3).", 1, [[12, 29, 49, 71]]),
  ("brethren", "Find Joseph's jealous brothers.", "Genesis 37:4", ["his brethren saw"], "When his brethren saw that their father loved him more, they hated him (Genesis 37:4).", 1, [[60, 23, 38, 74]]),
  ("flock", "Find a sheep from the flock Joseph fed.", "Genesis 37:2", ["feeding the flock"], "Joseph, being seventeen years old, was feeding the flock with his brethren (Genesis 37:2).", 2, [[35, 42, 16, 32], [0, 51, 14, 23], [58, 69, 22, 29]]),
 ],
 "sermon_mount": [
  ("teacher", "Find Jesus seated on the mountain.", "Matthew 5:1", ["when he was set"], "Seeing the multitudes, he went up into a mountain: and when he was set, his disciples came unto him (Matthew 5:1).", 1, [[14, 5, 31, 59]]),
  ("city", "Find a city set on a hill.", "Matthew 5:14", ["city that is set on an hill"], "A city that is set on an hill cannot be hid (Matthew 5:14).", 2, [[74, 14, 26, 20]]),
  ("flowers", "Find the flowers of the field.", "Matthew 6:28", ["lilies of the field"], "Consider the lilies of the field, how they grow (Matthew 6:28). The painting shows wildflowers on the hillside.", 3, [[9, 41, 34, 40]]),
 ],
 "creation": [
  ("sun", "Find the greater light to rule the day.", "Genesis 1:16", ["greater light"], "God made two great lights; the greater light to rule the day (Genesis 1:16).", 1, [[22, 39, 10, 12]]),
  ("moon", "Find the lesser light to rule the night.", "Genesis 1:16", ["lesser light"], "God made the lesser light to rule the night (Genesis 1:16).", 1, [[71, 4, 9, 13]]),
  ("stars", "Find the stars.", "Genesis 1:16", ["stars also"], "He made the stars also (Genesis 1:16).", 3, [[44, 0, 26, 24]]),
  ("tree", "Find the fruit tree yielding fruit.", "Genesis 1:11", ["fruit tree yielding fruit"], "God said, Let the earth bring forth the fruit tree yielding fruit after his kind (Genesis 1:11).", 2, [[85, 19, 15, 37]]),
  ("seas", "Find the Seas.", "Genesis 1:10", ["Seas"], "The gathering together of the waters called he Seas (Genesis 1:10).", 1, [[0, 51, 44, 42]]),
 ],
 "hero_jerusalem": [
  ("temple", "Find the temple adorned with goodly stones.", "Luke 21:5", ["goodly stones"], "Some spake of the temple, how it was adorned with goodly stones and gifts (Luke 21:5).", 2, [[53, 15, 13, 23]]),
  ("walls", "Find the walls of Jerusalem.", "Psalms 122:7", ["walls"], "Peace be within thy walls, and prosperity within thy palaces (Psalm 122:7).", 1, [[34, 33, 66, 18]]),
  ("olive", "Find an olive tree on the Mount of Olives.", "Luke 19:29", ["mount called the mount of Olives"], "Jesus came nigh to Bethphage and Bethany, at the mount called the mount of Olives (Luke 19:29).", 2, [[0, 0, 35, 50]]),
 ],
}
