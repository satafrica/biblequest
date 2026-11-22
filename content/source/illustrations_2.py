# Questions for illustration batch 2 (assets_2.py): Picture Bible Quiz and Hidden Object Adventure.
# Picture: (image, difficulty, prompt, options [correct first], reference, KJV keywords, explanation, hint)
# Hidden: {scene: [(key, prompt, reference, keywords, explanation, difficulty, boxes)]}, boxes [x, y, w, h] in percent,
# drawn by hand on a 10% grid over each 1200x675 image. Where boxes overlap, the smallest box wins a tap.

PICTURE_3 = [
 # Moses at the burning bush
 ("burning_bush", 1, "Which event does this illustration depict?", ["Moses at the burning bush", "Elijah on Mount Carmel", "Jacob's dream at Beth-el", "The giving of the manna"], "Exodus 3:2", ["bush burned with fire"], "The angel of the LORD appeared to Moses in a flame of fire out of the midst of a bush, and the bush was not consumed (Exodus 3:2).", "Moses was keeping a flock near Horeb."),
 ("burning_bush", 2, "Why did God tell Moses to put off his shoes?", ["The place where he stood was holy ground", "The ground was too hot", "He was about to cross a river", "Shoes were not allowed among the flock"], "Exodus 3:5", ["holy ground"], "God said, \u201cput off thy shoes from off thy feet, for the place whereon thou standest is holy ground\u201d (Exodus 3:5).", None),
 ("burning_bush", 2, "Whose flock was Moses keeping when he saw the bush?", ["Jethro's, his father in law", "Pharaoh's", "Aaron's", "Abraham's"], "Exodus 3:1", ["Jethro his father in law"], "Moses kept the flock of Jethro his father in law, the priest of Midian (Exodus 3:1).", None),
 ("burning_bush", 3, "What name did God give Moses at the bush?", ["I AM THAT I AM", "The LORD of hosts", "The Ancient of days", "The Holy One of Israel"], "Exodus 3:14", ["I AM THAT I AM"], "God said unto Moses, I AM THAT I AM (Exodus 3:14).", None),
 # Jacob's ladder
 ("jacob_ladder", 1, "Which event does this illustration depict?", ["Jacob's dream of a ladder", "Jacob wrestling at Peniel", "Joseph's dream of the sheaves", "Abram counting the stars"], "Genesis 28:12", ["ladder"], "Jacob dreamed of a ladder set up on the earth, reaching to heaven, with the angels of God ascending and descending on it (Genesis 28:12).", None),
 ("jacob_ladder", 2, "What did Jacob use for his pillows that night?", ["Stones of that place", "A bundle of sheaves", "A camel's saddle", "A folded cloak"], "Genesis 28:11", ["stones of that place"], "He took of the stones of that place, and put them for his pillows (Genesis 28:11).", None),
 ("jacob_ladder", 2, "What did Jacob name the place after his dream?", ["Beth-el", "Peniel", "Beer-sheba", "Mahanaim"], "Genesis 28:19", ["Beth-el"], "He called the name of that place Beth-el (Genesis 28:19).", None),
 ("jacob_ladder", 3, "What did Jacob say when he awoke?", ["Surely the LORD is in this place; and I knew it not", "I have seen God face to face", "The LORD will provide", "Here am I"], "Genesis 28:16", ["Surely the LORD is in this place"], "Jacob awaked out of his sleep and said, \u201cSurely the LORD is in this place; and I knew it not\u201d (Genesis 28:16).", None),
 # Jericho
 ("jericho_walls", 1, "Which event does this illustration depict?", ["The fall of Jericho", "The crossing of the Jordan", "The battle of Ai", "Gideon's three hundred men"], "Joshua 6:20", ["wall fell down flat"], "The priests blew the trumpets, the people shouted, and the wall fell down flat (Joshua 6:20).", None),
 ("jericho_walls", 2, "How many times did Israel go round the city on the seventh day?", ["Seven times", "Once", "Three times", "Twelve times"], "Joshua 6:15", ["seven times"], "On the seventh day they compassed the city after the same manner seven times (Joshua 6:15).", None),
 ("jericho_walls", 2, "What did the seven priests carry before the ark?", ["Seven trumpets of rams' horns", "Seven golden lampstands", "Twelve stones", "Burning torches"], "Joshua 6:4", ["seven trumpets of rams' horns"], "Seven priests bore before the ark seven trumpets of rams' horns (Joshua 6:4).", None),
 ("jericho_walls", 3, "What did Rahab bind in her window?", ["The scarlet line", "A blue cord", "A white linen cloth", "A branch of hyssop"], "Joshua 2:21", ["scarlet line"], "Rahab sent the spies away and bound the scarlet line in the window (Joshua 2:21).", None),
 # Ruth and Boaz
 ("ruth_boaz", 1, "Which event does this illustration depict?", ["Ruth gleaning in the field of Boaz", "Rebekah at the well", "Rachel keeping her father's sheep", "Joseph's dream of the sheaves"], "Ruth 2:3", ["gleaned in the field after the reapers"], "Ruth gleaned in the field after the reapers, in the part of the field belonging unto Boaz (Ruth 2:3).", None),
 ("ruth_boaz", 2, "Which harvest was beginning when Ruth and Naomi came to Bethlehem?", ["Barley harvest", "Wheat harvest", "Grape harvest", "Olive harvest"], "Ruth 1:22", ["beginning of barley harvest"], "They came to Bethlehem in the beginning of barley harvest (Ruth 1:22).", None),
 ("ruth_boaz", 2, "How did Boaz greet the reapers?", ["The LORD be with you", "Peace be unto this house", "Rise up, and let us go", "Work while it is day"], "Ruth 2:4", ["The LORD be with you"], "Boaz said unto the reapers, \u201cThe LORD be with you\u201d, and they answered, \u201cThe LORD bless thee\u201d (Ruth 2:4).", None),
 ("ruth_boaz", 3, "Who was Ruth's mother in law?", ["Naomi", "Orpah", "Hannah", "Leah"], "Ruth 2:20", ["Naomi said unto her daughter in law"], "Naomi said unto her daughter in law, \u201cBlessed be he of the LORD\u201d (Ruth 2:20).", None),
 # Elijah fed by ravens
 ("elijah_ravens", 1, "Which event does this illustration depict?", ["Elijah fed by ravens", "Noah sending out the raven", "Elijah on Mount Carmel", "Daniel in the lions' den"], "1 Kings 17:6", ["ravens brought him bread and flesh"], "The ravens brought Elijah bread and flesh in the morning and in the evening, and he drank of the brook (1 Kings 17:6).", None),
 ("elijah_ravens", 2, "By which brook did Elijah hide?", ["Cherith", "Kidron", "Jabbok", "Kishon"], "1 Kings 17:3", ["brook Cherith"], "God told Elijah to hide himself by the brook Cherith, that is before Jordan (1 Kings 17:3).", None),
 ("elijah_ravens", 2, "When did the ravens bring Elijah food?", ["In the morning and in the evening", "Once a day at noon", "Every seventh day", "Only on the sabbath"], "1 Kings 17:6", ["bread and flesh in the evening"], "The ravens brought him bread and flesh in the morning, and bread and flesh in the evening (1 Kings 17:6).", None),
 ("elijah_ravens", 3, "Why did Elijah have to leave the brook?", ["It dried up, because there had been no rain", "Ahab's soldiers found him", "The ravens stopped coming", "An angel sent him to Horeb"], "1 Kings 17:7", ["brook dried up"], "After a while the brook dried up, because there had been no rain in the land (1 Kings 17:7).", None),
 # Nehemiah
 ("nehemiah_walls", 1, "Which event does this illustration depict?", ["Nehemiah rebuilding the walls of Jerusalem", "Solomon building the temple", "The tower of Babel", "Joshua at Jericho"], "Nehemiah 4:6", ["So built we the wall"], "\u201cSo built we the wall; and all the wall was joined together unto the half thereof\u201d (Nehemiah 4:6).", None),
 ("nehemiah_walls", 2, "How were the builders ready for their enemies?", ["Every builder had his sword girded by his side", "They worked only at night", "They hired Persian soldiers", "They built a second wall first"], "Nehemiah 4:18", ["every one had his sword girded by his side"], "The builders, every one had his sword girded by his side, and so builded (Nehemiah 4:18).", None),
 ("nehemiah_walls", 2, "Why did the work go well, according to Nehemiah 4:6?", ["The people had a mind to work", "The king sent many workmen", "The enemies had gone away", "They had plenty of gold"], "Nehemiah 4:6", ["the people had a mind to work"], "The wall was joined together, \u201cfor the people had a mind to work\u201d (Nehemiah 4:6).", None),
 ("nehemiah_walls", 3, "How long did it take to finish the wall?", ["Fifty and two days", "Forty days", "Seven years", "Three months"], "Nehemiah 6:15", ["fifty and two days"], "The wall was finished in the twenty and fifth day of the month Elul, in fifty and two days (Nehemiah 6:15).", None),
 # Baptism of Jesus
 ("jesus_baptism", 1, "Which event does this illustration depict?", ["The baptism of Jesus", "The transfiguration", "Jesus calling Peter and Andrew", "The healing at the pool of Bethesda"], "Matthew 3:16", ["like a dove"], "When Jesus was baptized, the heavens were opened and he saw the Spirit of God descending like a dove (Matthew 3:16).", None),
 ("jesus_baptism", 2, "What did John the Baptist wear?", ["Raiment of camel's hair and a leathern girdle", "A coat of many colours", "A priest's linen ephod", "Soft clothing"], "Matthew 3:4", ["camel's hair"], "John had his raiment of camel's hair, and a leathern girdle about his loins (Matthew 3:4).", None),
 ("jesus_baptism", 2, "What did the voice from heaven say?", ["This is my beloved Son, in whom I am well pleased", "Go, and sin no more", "Arise, and go into Galilee", "Behold the Lamb of God"], "Matthew 3:17", ["This is my beloved Son, in whom I am well pleased"], "A voice from heaven said, \u201cThis is my beloved Son, in whom I am well pleased\u201d (Matthew 3:17).", None),
 ("jesus_baptism", 3, "What did John eat in the wilderness?", ["Locusts and wild honey", "Manna and quail", "Bread and fishes", "Figs and dates"], "Matthew 3:4", ["locusts and wild honey"], "John's meat was locusts and wild honey (Matthew 3:4).", None),
 # Wedding at Cana
 ("wedding_cana", 1, "Which event does this illustration depict?", ["The wedding at Cana", "The Last Supper", "The feast in Levi's house", "Belshazzar's feast"], "John 2:1", ["marriage in Cana of Galilee"], "There was a marriage in Cana of Galilee, and the mother of Jesus was there (John 2:1).", None),
 ("wedding_cana", 2, "How many waterpots of stone were set there?", ["Six", "Four", "Seven", "Twelve"], "John 2:6", ["six waterpots of stone"], "There were set there six waterpots of stone, containing two or three firkins apiece (John 2:6).", None),
 ("wedding_cana", 2, "What did Jesus first tell the servants to do?", ["Fill the waterpots with water", "Bring new wine skins", "Go to the market for wine", "Pour out the old wine"], "John 2:7", ["Fill the waterpots with water"], "Jesus saith unto them, \u201cFill the waterpots with water\u201d, and they filled them up to the brim (John 2:7).", None),
 ("wedding_cana", 3, "What did the ruler of the feast say to the bridegroom?", ["Thou hast kept the good wine until now", "This wine is too strong", "Let the servants drink first", "Bring more guests to the feast"], "John 2:10", ["kept the good wine until now"], "The ruler of the feast told the bridegroom, \u201cthou hast kept the good wine until now\u201d (John 2:10).", None),
 # Feeding the five thousand
 ("feeding_5000", 1, "Which event does this illustration depict?", ["The feeding of the five thousand", "The Sermon on the Mount", "The Last Supper", "Manna in the wilderness"], "John 6:9-11", ["about five thousand"], "A lad had five barley loaves and two small fishes; the men sat down on the grass, in number about five thousand, and were fed (John 6:9-11).", None),
 ("feeding_5000", 2, "What did the lad have?", ["Five barley loaves and two small fishes", "Seven loaves and a few fishes", "Twelve loaves and a jar of oil", "Two loaves and five fishes"], "John 6:9", ["five barley loaves, and two small fishes"], "Andrew said, \u201cThere is a lad here, which hath five barley loaves, and two small fishes\u201d (John 6:9).", None),
 ("feeding_5000", 2, "How many baskets of fragments were gathered?", ["Twelve", "Seven", "Five", "Three"], "John 6:13", ["twelve baskets"], "They filled twelve baskets with the fragments of the five barley loaves (John 6:13).", None),
 ("feeding_5000", 3, "Which disciple told Jesus about the lad?", ["Andrew", "Philip", "Peter", "Thomas"], "John 6:8-9", ["Andrew, Simon Peter's brother"], "Andrew, Simon Peter's brother, told Jesus about the lad with the loaves and fishes (John 6:8-9).", None),
 # Walking on the water
 ("walking_water", 1, "Which event does this illustration depict?", ["Jesus walking on the water", "Jonah thrown into the sea", "The miraculous catch of fish", "Paul's shipwreck"], "Matthew 14:25", ["walking on the sea"], "In the fourth watch of the night Jesus went unto them, walking on the sea (Matthew 14:25).", None),
 ("walking_water", 2, "Why did Peter begin to sink?", ["He saw the wind boisterous and was afraid", "The ship moved away", "His cloak was too heavy", "Jesus told him to go back"], "Matthew 14:30", ["wind boisterous"], "When Peter saw the wind boisterous, he was afraid; and beginning to sink, he cried, \u201cLord, save me\u201d (Matthew 14:30).", None),
 ("walking_water", 2, "In which watch of the night did Jesus come to the ship?", ["The fourth watch", "The first watch", "The second watch", "At sunset"], "Matthew 14:25", ["fourth watch"], "In the fourth watch of the night Jesus went unto them (Matthew 14:25).", None),
 ("walking_water", 3, "What did those in the ship say after the wind ceased?", ["Of a truth thou art the Son of God", "What manner of man is this", "Lord, save us: we perish", "Depart from us"], "Matthew 14:32-33", ["Of a truth thou art the Son of God"], "When the wind ceased, they that were in the ship worshipped him, saying, \u201cOf a truth thou art the Son of God\u201d (Matthew 14:32-33).", None),
 # Zacchaeus
 ("zacchaeus_tree", 1, "Which event does this illustration depict?", ["Zacchaeus in the sycomore tree", "Absalom caught in an oak", "Nathanael under the fig tree", "Jesus cursing the fig tree"], "Luke 19:4", ["sycomore tree"], "Zacchaeus ran before, and climbed up into a sycomore tree to see Jesus (Luke 19:4).", None),
 ("zacchaeus_tree", 2, "Why did Zacchaeus climb the tree?", ["He was little of stature and could not see for the crowd", "He was hiding from the publicans", "He wanted to pick its fruit", "Jesus had told him to wait there"], "Luke 19:3-4", ["little of stature"], "He sought to see Jesus, and could not for the press, because he was little of stature; so he ran before, and climbed up into a sycomore tree to see him (Luke 19:3-4).", None),
 ("zacchaeus_tree", 2, "What was Zacchaeus's position?", ["Chief among the publicans", "A fisherman", "A centurion", "A priest in the temple"], "Luke 19:2", ["chief among the publicans"], "Zacchaeus was the chief among the publicans, and he was rich (Luke 19:2).", None),
 ("zacchaeus_tree", 3, "How much of his goods did Zacchaeus give to the poor?", ["The half", "A tenth", "All of it", "A third"], "Luke 19:8", ["the half of my goods"], "Zacchaeus said, \u201cBehold, Lord, the half of my goods I give to the poor\u201d (Luke 19:8).", None),
 # Entry into Jerusalem
 ("triumphal_entry", 1, "Which event does this illustration depict?", ["Jesus entering Jerusalem", "The return of the prodigal son", "David bringing up the ark", "Nehemiah viewing the walls"], "Matthew 21:10", ["come into Jerusalem"], "When Jesus was come into Jerusalem, all the city was moved (Matthew 21:10).", None),
 ("triumphal_entry", 2, "What did the multitude spread in the way?", ["Their garments, and branches from the trees", "Gold and silver", "Flowers and olive oil", "Carpets from the temple"], "Matthew 21:8", ["spread their garments in the way"], "A very great multitude spread their garments in the way; others cut down branches from the trees, and strawed them in the way (Matthew 21:8).", None),
 ("triumphal_entry", 2, "What did the multitudes cry?", ["Hosanna to the Son of David", "Crucify him", "Long live the king", "Holy, holy, holy"], "Matthew 21:9", ["Hosanna to the Son of David"], "The multitudes cried, \u201cHosanna to the Son of David: Blessed is he that cometh in the name of the Lord\u201d (Matthew 21:9).", None),
 ("triumphal_entry", 3, "What animals did the disciples bring to Jesus?", ["An ass and a colt", "Two white horses", "A camel and its foal", "A team of oxen"], "Matthew 21:7", ["brought the ass, and the colt"], "The disciples brought the ass, and the colt, and put on them their clothes, and set him thereon (Matthew 21:7).", None),
 # Last Supper
 ("last_supper", 1, "Which event does this illustration depict?", ["The Last Supper", "The wedding at Cana", "The feeding of the five thousand", "Belshazzar's feast"], "Luke 22:14", ["twelve apostles"], "When the hour was come, Jesus sat down, and the twelve apostles with him (Luke 22:14).", None),
 ("last_supper", 2, "What did Jesus say as he gave them the bread?", ["This is my body which is given for you", "Take this to the poor", "Eat, for tomorrow we fast", "This is the bread of the wilderness"], "Luke 22:19", ["This is my body which is given for you"], "He took bread, gave thanks, brake it and said, \u201cThis is my body which is given for you: this do in remembrance of me\u201d (Luke 22:19).", None),
 ("last_supper", 2, "Which feast were they eating?", ["The passover", "The feast of tabernacles", "Purim", "The feast of weeks"], "Luke 22:15", ["eat this passover"], "Jesus said, \u201cWith desire I have desired to eat this passover with you before I suffer\u201d (Luke 22:15).", None),
 ("last_supper", 3, "Which two disciples did Jesus send to prepare the passover?", ["Peter and John", "James and John", "Andrew and Philip", "Thomas and Matthew"], "Luke 22:8", ["Peter and John"], "He sent Peter and John, saying, \u201cGo and prepare us the passover, that we may eat\u201d (Luke 22:8).", None),
 # Lazarus
 ("lazarus_tomb", 1, "Which event does this illustration depict?", ["The raising of Lazarus", "The resurrection of Jesus", "The widow's son at Nain", "The raising of Jairus's daughter"], "John 11:43-44", ["Lazarus, come forth"], "Jesus cried with a loud voice, \u201cLazarus, come forth\u201d, and he that was dead came forth, bound with graveclothes (John 11:43-44).", None),
 ("lazarus_tomb", 2, "How was Lazarus's face bound?", ["About with a napkin", "With a crown of thorns", "With a linen veil and spices", "It was not covered"], "John 11:44", ["bound about with a napkin"], "He came forth bound hand and foot with graveclothes: and his face was bound about with a napkin (John 11:44).", None),
 ("lazarus_tomb", 2, "How long had Lazarus lain in the grave when Jesus came?", ["Four days", "Three days", "Seven days", "One day"], "John 11:17", ["four days"], "When Jesus came, he found that he had lain in the grave four days already (John 11:17).", None),
 ("lazarus_tomb", 3, "Which short verse describes Jesus on the way to the grave of Lazarus?", ["Jesus wept", "Jesus slept", "Jesus rejoiced", "Jesus was silent"], "John 11:35", ["Jesus wept"], "\u201cJesus wept\u201d (John 11:35).", None),
 # Damascus road
 ("damascus_road", 1, "Which event does this illustration depict?", ["Saul on the road to Damascus", "Peter's vision of the great sheet", "Elijah taken up to heaven", "Moses at the burning bush"], "Acts 9:3-4", ["light from heaven"], "As Saul came near Damascus, suddenly there shined round about him a light from heaven: and he fell to the earth (Acts 9:3-4).", None),
 ("damascus_road", 2, "What did the voice say to Saul?", ["Saul, Saul, why persecutest thou me?", "Arise, go to Nineveh", "Put off thy shoes", "Follow me, and I will make you fishers of men"], "Acts 9:4", ["why persecutest thou me"], "He fell to the earth and heard a voice saying, \u201cSaul, Saul, why persecutest thou me?\u201d (Acts 9:4).", None),
 ("damascus_road", 2, "How long was Saul without sight?", ["Three days", "Seven days", "Forty days", "One night"], "Acts 9:9", ["three days without sight"], "He was three days without sight, and neither did eat nor drink (Acts 9:9).", None),
 ("damascus_road", 3, "Whom did the Lord send to lay hands on Saul in Damascus?", ["Ananias", "Barnabas", "Silas", "Philip"], "Acts 9:17", ["Ananias"], "Ananias went his way, entered the house and put his hands on him, saying, \u201cBrother Saul\u2026\u201d (Acts 9:17).", None),
 # Miraculous catch
 ("miraculous_catch", 1, "Which event does this illustration depict?", ["The miraculous catch of fish", "Jesus walking on the water", "Jonah and the great fish", "The feeding of the five thousand"], "Luke 5:6", ["great multitude of fishes"], "When they had let down the nets, they inclosed a great multitude of fishes: and their net brake (Luke 5:6).", None),
 ("miraculous_catch", 2, "What happened to their net?", ["It brake", "It was lost in the sea", "It caught nothing", "It was hung up to dry"], "Luke 5:6", ["their net brake"], "They inclosed a great multitude of fishes: and their net brake (Luke 5:6).", None),
 ("miraculous_catch", 2, "What did Simon Peter say when he saw the catch?", ["Depart from me; for I am a sinful man, O Lord", "Lord, to whom shall we go?", "It is the Lord", "Lord, save me"], "Luke 5:8", ["Depart from me; for I am a sinful man"], "Simon Peter fell down at Jesus' knees, saying, \u201cDepart from me; for I am a sinful man, O Lord\u201d (Luke 5:8).", None),
 ("miraculous_catch", 3, "What did Jesus tell Simon he would catch from then on?", ["Men", "Fish of every kind", "Treasure in heaven", "Nothing at all"], "Luke 5:10", ["thou shalt catch men"], "Jesus said unto Simon, \u201cFear not; from henceforth thou shalt catch men\u201d (Luke 5:10).", None),
 # Wise men
 ("wise_men", 1, "Which event does this illustration depict?", ["The wise men bringing gifts", "The shepherds at the manger", "The queen of Sheba visiting Solomon", "Joseph's brothers bowing in Egypt"], "Matthew 2:11", ["they saw the young child with Mary his mother"], "The wise men came into the house, saw the young child with Mary his mother, fell down and worshipped him, and presented gifts (Matthew 2:11).", None),
 ("wise_men", 2, "What gifts did the wise men present?", ["Gold, frankincense and myrrh", "Silver, oil and wine", "Gold, spices and linen", "Pearls, incense and silk"], "Matthew 2:11", ["gold, and frankincense, and myrrh"], "They presented unto him gifts; gold, and frankincense, and myrrh (Matthew 2:11).", None),
 ("wise_men", 2, "Where did the wise men find the young child?", ["In a house", "In a manger", "In the temple", "In a tent"], "Matthew 2:11", ["come into the house"], "When they were come into the house, they saw the young child with Mary his mother (Matthew 2:11).", None),
 ("wise_men", 3, "How were the wise men told not to return to Herod?", ["God warned them in a dream", "An angel spoke to them at the house", "The star led them away", "Joseph told them"], "Matthew 2:12", ["warned of God in a dream"], "Being warned of God in a dream that they should not return to Herod, they departed into their own country another way (Matthew 2:12).", None),
 # Sinai tablets
 ("sinai_tablets", 1, "Which event does this illustration depict?", ["Moses bringing the tables of the testimony down from the mount", "Elijah at Horeb", "Joshua at Jericho", "Abraham on Mount Moriah"], "Exodus 32:15", ["two tables of the testimony"], "Moses turned, and went down from the mount, and the two tables of the testimony were in his hand (Exodus 32:15).", None),
 ("sinai_tablets", 2, "Whose writing was on the first tables, according to Exodus 32:16?", ["God's", "Moses'", "Aaron's", "Joshua's"], "Exodus 32:16", ["the writing was the writing of God"], "The tables were the work of God, and the writing was the writing of God, graven upon the tables (Exodus 32:16).", None),
 ("sinai_tablets", 2, "Why was Mount Sinai altogether on a smoke?", ["The LORD descended upon it in fire", "A forest fire had started", "The people burned offerings on it", "A storm had struck it"], "Exodus 19:18", ["the LORD descended upon it in fire"], "Mount Sinai was altogether on a smoke, because the LORD descended upon it in fire (Exodus 19:18).", None),
 ("sinai_tablets", 3, "What did Moses see as he came near the camp?", ["The calf, and the dancing", "A pillar of cloud", "Joshua's army in battle", "The people building the tabernacle"], "Exodus 32:19", ["he saw the calf, and the dancing"], "As soon as he came nigh unto the camp, he saw the calf, and the dancing: and he cast the tables out of his hands (Exodus 32:19).", None),
 # Parable of the sower
 ("parable_sower", 1, "Which parable does this illustration show?", ["The parable of the sower", "The parable of the tares", "The parable of the mustard seed", "The parable of the lost sheep"], "Matthew 13:3-4", ["a sower went forth to sow"], "Jesus said, \u201cBehold, a sower went forth to sow\u201d; some seed fell by the way side, and the fowls devoured it (Matthew 13:3-4).", None),
 ("parable_sower", 2, "What happened to the seed that fell by the way side?", ["The fowls came and devoured it", "It sprang up quickly", "Thorns choked it", "It brought forth an hundredfold"], "Matthew 13:4", ["fowls came and devoured them"], "Some seeds fell by the way side, and the fowls came and devoured them up (Matthew 13:4).", None),
 ("parable_sower", 2, "Why did the seed on stony places wither away?", ["It had no root", "The fowls ate it", "It had too much water", "The sower trod on it"], "Matthew 13:6", ["they had no root"], "When the sun was up they were scorched; and because they had no root, they withered away (Matthew 13:6).", None),
 ("parable_sower", 3, "What did the seed on good ground bring forth?", ["Some an hundredfold, some sixtyfold, some thirtyfold", "Always a thousandfold", "Only tares", "Twelve baskets full"], "Matthew 13:8", ["some an hundredfold"], "Other fell into good ground, and brought forth fruit, some an hundredfold, some sixtyfold, some thirtyfold (Matthew 13:8).", None),
 # Lost sheep
 ("lost_sheep", 1, "Which parable does this illustration show?", ["The parable of the lost sheep", "The parable of the lost coin", "The parable of the prodigal son", "The parable of the good Samaritan"], "Luke 15:4", ["ninety and nine"], "Jesus asked what man, having an hundred sheep and losing one, does not leave the ninety and nine and go after that which is lost (Luke 15:4).", None),
 ("lost_sheep", 2, "How many sheep did the man have before one was lost?", ["An hundred", "Ninety and nine", "Ten", "Twelve"], "Luke 15:4", ["an hundred sheep"], "\u201cWhat man of you, having an hundred sheep, if he lose one of them\u2026\u201d (Luke 15:4).", None),
 ("lost_sheep", 2, "What did the man do when he found the sheep?", ["Laid it on his shoulders, rejoicing", "Sold it in the market", "Tied it to a tree", "Sent it home with a servant"], "Luke 15:5", ["layeth it on his shoulders, rejoicing"], "When he hath found it, he layeth it on his shoulders, rejoicing (Luke 15:5).", None),
 ("lost_sheep", 3, "According to Jesus, there is more joy in heaven over what?", ["One sinner that repenteth", "Ninety and nine just persons", "A full sheepfold", "A great harvest"], "Luke 15:7", ["one sinner that repenteth"], "Joy shall be in heaven over one sinner that repenteth, more than over ninety and nine just persons, which need no repentance (Luke 15:7).", None),
]

HIDDEN_2 = {
 "burning_bush": [
  ("bush", "Find the bush that burned with fire.", "Exodus 3:2", ["bush burned with fire"], "The bush burned with fire, and the bush was not consumed (Exodus 3:2).", 1, [[56, 10, 42, 55]]),
  ("shoes", "Find the shoes God told Moses to put off his feet.", "Exodus 3:5", ["put off thy shoes"], "God said, \u201cput off thy shoes from off thy feet, for the place whereon thou standest is holy ground\u201d (Exodus 3:5).", 2, [[5, 77, 20, 13]]),
  ("rod", "Find the rod in Moses' care.", "Exodus 4:2", ["A rod"], "The LORD asked Moses, \u201cWhat is that in thine hand?\u201d And he said, \u201cA rod\u201d (Exodus 4:2).", 2, [[18, 80, 48, 15]]),
  ("flock", "Find the flock Moses was keeping.", "Exodus 3:1", ["kept the flock"], "Moses kept the flock of Jethro his father in law, and led the flock to the backside of the desert (Exodus 3:1).", 1, [[1, 14, 30, 28]]),
 ],
 "jacob_ladder": [
  ("ladder", "Find the ladder that reached to heaven.", "Genesis 28:12", ["ladder set up on the earth"], "Jacob dreamed of a ladder set up on the earth, and the top of it reached to heaven (Genesis 28:12).", 1, [[45, 0, 22, 70]]),
  ("angels", "Find an angel of God on the ladder.", "Genesis 28:12", ["angels of God ascending and descending"], "Jacob saw the angels of God ascending and descending on the ladder (Genesis 28:12).", 2, [[41, 10, 13, 26], [53, 20, 16, 42]]),
  ("stone", "Find the stone Jacob used for a pillow.", "Genesis 28:11", ["stones of that place"], "Jacob took of the stones of that place, and put them for his pillows (Genesis 28:11).", 2, [[6, 58, 26, 30]]),
  ("jacob", "Find Jacob lying down to sleep.", "Genesis 28:11", ["lay down in that place to sleep"], "Jacob lay down in that place to sleep, because the sun was set (Genesis 28:11).", 1, [[30, 52, 62, 40]]),
 ],
 "jericho_walls": [
  ("trumpets", "Find a trumpet of rams' horns.", "Joshua 6:4", ["trumpets of rams' horns"], "Seven priests bore seven trumpets of rams' horns before the ark (Joshua 6:4).", 1, [[8, 20, 48, 16]]),
  ("ark", "Find the ark of the covenant.", "Joshua 6:6", ["ark of the covenant"], "Joshua told the priests, \u201cTake up the ark of the covenant\u201d (Joshua 6:6).", 1, [[64, 25, 15, 20]]),
  ("scarlet", "Find the scarlet thread in Rahab's window.", "Joshua 2:21", ["bound the scarlet line in the window"], "As the spies had told her, Rahab bound the scarlet line in the window (Joshua 2:21).", 3, [[78, 9, 5, 20]]),
  ("armed_men", "Find the armed men marching with the priests.", "Joshua 6:9", ["armed men"], "The armed men went before the priests that blew with the trumpets, and the rereward came after the ark (Joshua 6:9).", 2, [[84, 35, 16, 40]]),
  ("wall", "Find the wall of Jericho.", "Joshua 6:20", ["wall fell down flat"], "When the people shouted, the wall fell down flat (Joshua 6:20).", 1, [[53, 0, 47, 24]]),
 ],
 "ruth_boaz": [
  ("ruth", "Find Ruth gleaning after the reapers.", "Ruth 2:3", ["gleaned in the field after the reapers"], "Ruth went, and came, and gleaned in the field after the reapers (Ruth 2:3).", 1, [[22, 38, 28, 52]]),
  ("boaz", "Find Boaz speaking to Ruth.", "Ruth 2:8", ["Then said Boaz unto Ruth"], "Boaz said unto Ruth, \u201cGo not to glean in another field\u201d (Ruth 2:8).", 1, [[60, 0, 26, 92]]),
  ("reapers", "Find one of the reapers.", "Ruth 2:4", ["said unto the reapers"], "Boaz came from Bethlehem and said unto the reapers, \u201cThe LORD be with you\u201d (Ruth 2:4).", 2, [[3, 18, 22, 42]]),
  ("sheaves", "Find a sheaf of grain.", "Ruth 2:7", ["among the sheaves"], "Ruth asked to glean and gather after the reapers among the sheaves (Ruth 2:7).", 2, [[50, 22, 10, 25], [87, 25, 11, 24]]),
  ("vessels", "Find the vessels Boaz told Ruth to drink from.", "Ruth 2:9", ["go unto the vessels, and drink"], "Boaz told Ruth that when she was athirst she could go unto the vessels, and drink (Ruth 2:9).", 3, [[87, 52, 13, 32]]),
 ],
 "elijah_ravens": [
  ("ravens", "Find a raven bringing food.", "1 Kings 17:6", ["ravens brought him bread and flesh"], "The ravens brought Elijah bread and flesh in the morning and in the evening (1 Kings 17:6).", 1, [[37, 0, 24, 25], [63, 1, 23, 30]]),
  ("bread", "Find the bread the ravens brought.", "1 Kings 17:6", ["brought him bread"], "The ravens brought him bread and flesh (1 Kings 17:6).", 2, [[42, 16, 8, 9]]),
  ("flesh", "Find the flesh the ravens brought.", "1 Kings 17:6", ["bread and flesh"], "The ravens brought him bread and flesh in the morning, and bread and flesh in the evening (1 Kings 17:6).", 3, [[62, 19, 6, 10]]),
  ("brook", "Find the brook Elijah drank from.", "1 Kings 17:6", ["he drank of the brook"], "Elijah drank of the brook Cherith (1 Kings 17:5-6).", 2, [[55, 70, 45, 30]]),
 ],
 "nehemiah_walls": [
  ("trumpet", "Find the man who sounded the trumpet.", "Nehemiah 4:18", ["he that sounded the trumpet"], "Nehemiah wrote, \u201che that sounded the trumpet was by me\u201d (Nehemiah 4:18).", 2, [[46, 1, 13, 32]]),
  ("sword", "Find the builder's sword.", "Nehemiah 4:18", ["sword girded by his side"], "The builders, every one had his sword girded by his side, and so builded (Nehemiah 4:18).", 2, [[40, 66, 23, 25]]),
  ("builder", "Find a builder laying stones on the wall.", "Nehemiah 4:17", ["wrought in the work"], "They which builded on the wall, with one of their hands wrought in the work, and with the other hand held a weapon (Nehemiah 4:17).", 1, [[44, 29, 34, 38]]),
  ("doors", "Find the doors set up in the gate.", "Nehemiah 3:3", ["set up the doors thereof"], "The builders of the fish gate laid the beams thereof, and set up the doors thereof (Nehemiah 3:3).", 1, [[72, 12, 26, 58]]),
 ],
 "jesus_baptism": [
  ("dove", "Find the Spirit of God descending like a dove.", "Matthew 3:16", ["descending like a dove"], "Jesus saw the Spirit of God descending like a dove, and lighting upon him (Matthew 3:16).", 1, [[50, 2, 17, 18]]),
  ("camels_hair", "Find John's raiment of camel's hair.", "Matthew 3:4", ["raiment of camel's hair"], "John had his raiment of camel's hair (Matthew 3:4).", 2, [[24, 17, 19, 65]]),
  ("girdle", "Find John's leathern girdle.", "Matthew 3:4", ["leathern girdle about his loins"], "John wore a leathern girdle about his loins (Matthew 3:4).", 3, [[30, 56, 12, 7]]),
  ("jordan", "Find the river Jordan.", "Matthew 3:13", ["Jordan"], "Jesus came from Galilee to Jordan unto John, to be baptized of him (Matthew 3:13).", 1, [[0, 70, 100, 30]]),
  ("heavens", "Find the heavens opened.", "Matthew 3:16", ["the heavens were opened"], "Jesus went up straightway out of the water: and, lo, the heavens were opened unto him (Matthew 3:16).", 2, [[38, 0, 34, 22]]),
 ],
 "wedding_cana": [
  ("waterpots", "Find the six waterpots of stone.", "John 2:6", ["six waterpots of stone"], "There were set there six waterpots of stone, after the manner of the purifying of the Jews (John 2:6).", 1, [[0, 46, 47, 28]]),
  ("servant", "Find the servant drawing out from a waterpot.", "John 2:8", ["Draw out now"], "Jesus said unto the servants, \u201cDraw out now, and bear unto the governor of the feast\u201d (John 2:8).", 2, [[19, 15, 18, 33]]),
  ("ruler", "Find the ruler of the feast tasting the wine.", "John 2:9", ["ruler of the feast had tasted the water that was made wine"], "The ruler of the feast tasted the water that was made wine, and knew not whence it was (John 2:9).", 1, [[45, 9, 21, 84]]),
 ],
 "feeding_5000": [
  ("lad", "Find the lad who brought the food.", "John 6:9", ["There is a lad here"], "Andrew said, \u201cThere is a lad here, which hath five barley loaves, and two small fishes\u201d (John 6:9).", 1, [[48, 32, 24, 63]]),
  ("loaves", "Find the barley loaves.", "John 6:9", ["five barley loaves"], "The lad had five barley loaves (John 6:9).", 2, [[44, 47, 9, 7]]),
  ("fishes", "Find the two small fishes.", "John 6:9", ["two small fishes"], "The lad had two small fishes (John 6:9).", 3, [[49, 52, 7, 6]]),
  ("baskets", "Find a basket of fragments.", "John 6:13", ["twelve baskets with the fragments"], "They filled twelve baskets with the fragments of the five barley loaves (John 6:13).", 2, [[60, 22, 38, 30]]),
  ("grass", "Find the grass where the people sat down.", "John 6:10", ["there was much grass in the place"], "Now there was much grass in the place. So the men sat down (John 6:10).", 2, [[72, 58, 28, 42]]),
 ],
 "walking_water": [
  ("jesus", "Find Jesus walking on the sea.", "Matthew 14:25", ["walking on the sea"], "In the fourth watch of the night Jesus went unto them, walking on the sea (Matthew 14:25).", 1, [[56, 8, 26, 68]]),
  ("peter", "Find Peter beginning to sink.", "Matthew 14:30", ["beginning to sink"], "Beginning to sink, Peter cried, saying, \u201cLord, save me\u201d (Matthew 14:30).", 1, [[15, 52, 38, 36]]),
  ("ship", "Find the ship tossed with waves.", "Matthew 14:24", ["ship was now in the midst of the sea, tossed with waves"], "The ship was now in the midst of the sea, tossed with waves: for the wind was contrary (Matthew 14:24).", 1, [[0, 0, 50, 52]]),
  ("hand", "Find the hand Jesus stretched forth.", "Matthew 14:31", ["stretched forth his hand"], "Immediately Jesus stretched forth his hand, and caught him (Matthew 14:31).", 3, [[51, 40, 8, 8]]),
 ],
 "zacchaeus_tree": [
  ("tree", "Find the sycomore tree.", "Luke 19:4", ["sycomore tree"], "Zacchaeus climbed up into a sycomore tree to see Jesus (Luke 19:4).", 1, [[0, 0, 58, 58]]),
  ("zacchaeus", "Find Zacchaeus up in the tree.", "Luke 19:5", ["Zacchaeus, make haste, and come down"], "Jesus looked up and said, \u201cZacchaeus, make haste, and come down\u201d (Luke 19:5).", 1, [[21, 2, 24, 36]]),
  ("jesus", "Find Jesus looking up into the tree.", "Luke 19:5", ["he looked up"], "When Jesus came to the place, he looked up, and saw him (Luke 19:5).", 2, [[46, 42, 30, 58]]),
  ("press", "Find the crowd, the press that blocked Zacchaeus's view.", "Luke 19:3", ["could not for the press"], "He sought to see Jesus, and could not for the press, because he was little of stature (Luke 19:3).", 2, [[0, 58, 45, 42], [77, 45, 23, 55]]),
 ],
 "triumphal_entry": [
  ("colt", "Find the colt Jesus rode.", "Mark 11:7", ["he sat upon him"], "They brought the colt to Jesus, and cast their garments on him; and he sat upon him (Mark 11:7).", 1, [[43, 30, 16, 57]]),
  ("garments", "Find the garments spread in the way.", "Matthew 21:8", ["spread their garments in the way"], "A very great multitude spread their garments in the way (Matthew 21:8).", 1, [[17, 77, 33, 17], [57, 85, 40, 15]]),
  ("branches", "Find a branch cut down from the trees.", "Matthew 21:8", ["cut down branches from the trees"], "Others cut down branches from the trees, and strawed them in the way (Matthew 21:8).", 2, [[12, 0, 17, 13], [29, 13, 7, 16], [77, 10, 9, 25]]),
  ("city", "Find the city of Jerusalem.", "Matthew 21:10", ["come into Jerusalem"], "When he was come into Jerusalem, all the city was moved, saying, \u201cWho is this?\u201d (Matthew 21:10).", 2, [[52, 0, 48, 28]]),
 ],
 "last_supper": [
  ("bread", "Find the bread Jesus brake.", "Luke 22:19", ["he took bread, and gave thanks, and brake it"], "He took bread, and gave thanks, and brake it, and gave unto them (Luke 22:19).", 1, [[42, 41, 7, 6]]),
  ("cup", "Find the cup.", "Luke 22:20", ["Likewise also the cup after supper"], "Likewise also the cup after supper, saying, \u201cThis cup is the new testament in my blood\u201d (Luke 22:20).", 2, [[44, 48, 4, 11]]),
  ("apostles", "Find the apostles sitting with Jesus.", "Luke 22:14", ["the twelve apostles with him"], "When the hour was come, he sat down, and the twelve apostles with him (Luke 22:14).", 1, [[0, 22, 38, 50], [53, 23, 47, 45]]),
 ],
 "lazarus_tomb": [
  ("cave", "Find the cave where Lazarus was buried.", "John 11:38", ["It was a cave"], "Jesus cometh to the grave. It was a cave, and a stone lay upon it (John 11:38).", 1, [[58, 8, 22, 66]]),
  ("stone", "Find the stone they took away.", "John 11:41", ["they took away the stone"], "Then they took away the stone from the place where the dead was laid (John 11:41).", 1, [[78, 7, 22, 63]]),
  ("graveclothes", "Find Lazarus bound with graveclothes.", "John 11:44", ["bound hand and foot with graveclothes"], "He that was dead came forth, bound hand and foot with graveclothes (John 11:44).", 2, [[63, 14, 14, 61]]),
  ("napkin", "Find the napkin bound about his face.", "John 11:44", ["face was bound about with a napkin"], "His face was bound about with a napkin (John 11:44).", 3, [[66, 19, 6, 6]]),
 ],
 "damascus_road": [
  ("light", "Find the light from heaven.", "Acts 9:3", ["light from heaven"], "Suddenly there shined round about him a light from heaven (Acts 9:3).", 1, [[42, 0, 32, 18]]),
  ("saul", "Find Saul fallen to the earth.", "Acts 9:4", ["he fell to the earth"], "He fell to the earth, and heard a voice saying unto him, \u201cSaul, Saul, why persecutest thou me?\u201d (Acts 9:4).", 1, [[36, 46, 46, 44]]),
  ("companions", "Find the men who journeyed with Saul.", "Acts 9:7", ["men which journeyed with him stood speechless"], "The men which journeyed with him stood speechless, hearing a voice, but seeing no man (Acts 9:7).", 2, [[20, 10, 32, 68]]),
  ("damascus", "Find the city of Damascus.", "Acts 9:8", ["brought him into Damascus"], "They led him by the hand, and brought him into Damascus (Acts 9:8).", 2, [[57, 18, 43, 22]]),
 ],
 "miraculous_catch": [
  ("net", "Find the net that brake.", "Luke 5:6", ["their net brake"], "They inclosed a great multitude of fishes: and their net brake (Luke 5:6).", 1, [[37, 49, 57, 46]]),
  ("other_ship", "Find the other ship the partners came in.", "Luke 5:7", ["the other ship"], "They beckoned unto their partners, which were in the other ship, that they should come and help them (Luke 5:7).", 2, [[64, 22, 36, 30]]),
  ("full_ship", "Find the fishes filling the other ship.", "Luke 5:6-7", ["filled both the ships"], "They inclosed a great multitude of fishes; their partners came, and filled both the ships, so that they began to sink (Luke 5:6-7).", 3, [[67, 29, 28, 12]]),
  ("jesus", "Find Jesus sitting in the ship.", "Luke 5:3", ["he sat down, and taught the people out of the ship"], "Jesus sat down, and taught the people out of the ship (Luke 5:3).", 2, [[9, 13, 21, 48]]),
 ],
 "wise_men": [
  ("gold", "Find the gold.", "Matthew 2:11", ["gold"], "They presented unto him gifts; gold, and frankincense, and myrrh (Matthew 2:11).", 1, [[34, 40, 11, 19]]),
  ("frankincense", "Find the frankincense.", "Matthew 2:11", ["frankincense"], "Frankincense was one of the gifts the wise men presented (Matthew 2:11).", 2, [[56, 37, 7, 14]]),
  ("myrrh", "Find the myrrh.", "Matthew 2:11", ["myrrh"], "Myrrh was one of the gifts the wise men presented (Matthew 2:11).", 3, [[70, 49, 8, 16]]),
  ("star", "Find the star the wise men followed.", "Matthew 2:9", ["the star, which they saw in the east"], "The star, which they saw in the east, went before them, till it came and stood over where the young child was (Matthew 2:9).", 1, [[78, 4, 10, 16]]),
  ("child", "Find the young child with Mary his mother.", "Matthew 2:11", ["the young child with Mary his mother"], "They saw the young child with Mary his mother, and fell down, and worshipped him (Matthew 2:11).", 1, [[8, 9, 25, 80]]),
 ],
 "sinai_tablets": [
  ("tables", "Find the two tables of the testimony.", "Exodus 32:15", ["two tables of the testimony"], "The two tables of the testimony were in his hand: tables that were written on both their sides (Exodus 32:15).", 1, [[32, 20, 9, 24], [47, 23, 9, 22]]),
  ("smoke", "Find the smoke on the mount.", "Exodus 19:18", ["mount Sinai was altogether on a smoke"], "When the LORD came down to give the law, mount Sinai was altogether on a smoke (Exodus 19:18); the picture recalls that earlier moment.", 2, [[8, 0, 32, 14]]),
  ("camp", "Find the camp Moses was coming down to.", "Exodus 32:19", ["came nigh unto the camp"], "As soon as he came nigh unto the camp, he saw the calf, and the dancing (Exodus 32:19).", 2, [[57, 45, 43, 40]]),
  ("moses", "Find Moses going down from the mount.", "Exodus 32:15", ["Moses turned, and went down from the mount"], "Moses turned, and went down from the mount, with the two tables in his hand (Exodus 32:15).", 1, [[29, 10, 30, 78]]),
 ],
 "parable_sower": [
  ("sower", "Find the sower going forth to sow.", "Matthew 13:3", ["a sower went forth to sow"], "\u201cBehold, a sower went forth to sow\u201d (Matthew 13:3).", 1, [[37, 2, 24, 82]]),
  ("fowls", "Find the fowls devouring the seed.", "Matthew 13:4", ["the fowls came and devoured them"], "Some seeds fell by the way side, and the fowls came and devoured them up (Matthew 13:4).", 1, [[1, 59, 30, 31]]),
  ("stony", "Find the stony places.", "Matthew 13:5", ["stony places"], "Some fell upon stony places, where they had not much earth (Matthew 13:5).", 2, [[0, 32, 32, 26]]),
  ("thorns", "Find the thorns.", "Matthew 13:7", ["some fell among thorns"], "Some fell among thorns; and the thorns sprung up, and choked them (Matthew 13:7).", 2, [[52, 52, 48, 48]]),
  ("good_ground", "Find the good ground bringing forth fruit.", "Matthew 13:8", ["fell into good ground"], "Other fell into good ground, and brought forth fruit (Matthew 13:8).", 3, [[60, 20, 40, 32]]),
 ],
 "lost_sheep": [
  ("sheep", "Find the lost sheep on the shepherd's shoulders.", "Luke 15:5", ["layeth it on his shoulders"], "When he hath found it, he layeth it on his shoulders, rejoicing (Luke 15:5).", 1, [[38, 8, 17, 34]]),
  ("ninety_nine", "Find the ninety and nine left behind.", "Luke 15:4", ["leave the ninety and nine"], "He doth leave the ninety and nine in the wilderness, and go after that which is lost (Luke 15:4).", 2, [[3, 36, 24, 13]]),
  ("neighbours", "Find the home where he calls his friends and neighbours.", "Luke 15:6", ["he calleth together his friends and neighbours"], "When he cometh home, he calleth together his friends and neighbours, saying, \u201cRejoice with me\u201d (Luke 15:6).", 3, [[65, 8, 35, 22]]),
  ("shepherd", "Find the man who had an hundred sheep.", "Luke 15:4", ["having an hundred sheep"], "\u201cWhat man of you, having an hundred sheep, if he lose one of them\u2026\u201d (Luke 15:4).", 1, [[37, 5, 26, 88]]),
 ],
}
