"""Fill job_advancements table with complete MapleStory advancement data."""

import sqlite3
import os

DB_PATH = os.path.join("C:\\Users\\yekwon\\maple-archive\\data\\maple.db")


def get_job_map(cur):
    """Get job_class name -> id mapping."""
    cur.execute("SELECT id, name FROM job_classes")
    return {name: id_ for id_, name in cur.fetchall()}


def build_advancements():
    """Build complete advancement data for all 49 job classes.

    Format: job_name -> [(adv_level, name, name_ko, level_req, description)]

    Advancement levels:
        0 = Beginner class
        1 = 1st Job (Lv.10, Magician Lv.8)
        2 = 2nd Job (Lv.30)
        3 = 3rd Job (Lv.60)
        4 = 4th Job (Lv.100)
        5 = 5th Job / V Matrix (Lv.200)
        6 = 6th Job / HEXA Matrix (Lv.260)
    """
    data = {}

    # ================================================================
    # EXPLORERS - Warrior Branch
    # ================================================================
    data["Hero"] = [
        (0, "Beginner", "초보자", 1,
         "A new adventurer beginning their journey in Maple World."),
        (1, "Warrior", "전사", 10,
         "First job advancement into the Warrior class with basic sword and HP skills."),
        (2, "Fighter", "파이터", 30,
         "Specializes in sword combo attacks building orbs for enhanced damage."),
        (3, "Crusader", "크루세이더", 60,
         "Masters advanced combo techniques, rage skills, and party attack buffs."),
        (4, "Hero", "히어로", 100,
         "The ultimate swordsman wielding devastating Raging Blow and Enrage."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Valhalla."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Paladin"] = [
        (0, "Beginner", "초보자", 1,
         "A new adventurer beginning their journey in Maple World."),
        (1, "Warrior", "전사", 10,
         "First job advancement into the Warrior class with basic sword and HP skills."),
        (2, "Page", "페이지", 30,
         "Specializes in elemental charges and shield-based defensive combat."),
        (3, "White Knight", "화이트 나이트", 60,
         "Masters holy elemental combat with ice, fire, and lightning charges."),
        (4, "Paladin", "팔라딘", 100,
         "The divine protector wielding Blast, Divine Charge, and Sacrosanctity."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Grand Cross."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Dark Knight"] = [
        (0, "Beginner", "초보자", 1,
         "A new adventurer beginning their journey in Maple World."),
        (1, "Warrior", "전사", 10,
         "First job advancement into the Warrior class with basic HP and spear skills."),
        (2, "Spearman", "스피어맨", 30,
         "Specializes in spear and polearm combat with HP sacrifice mechanics."),
        (3, "Dragon Knight", "용기사", 60,
         "Masters dark spear techniques and gains the ability to sacrifice HP for power."),
        (4, "Dark Knight", "다크나이트", 100,
         "The dark warrior wielding Gungnir's Descent and cheating death with Final Pact."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Dark Spear."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    # ================================================================
    # EXPLORERS - Magician Branch
    # ================================================================
    data["Arch Mage (Fire/Poison)"] = [
        (0, "Beginner", "초보자", 1,
         "A new adventurer beginning their journey in Maple World."),
        (1, "Magician", "마법사", 8,
         "First job advancement into the Magician class with basic magic skills."),
        (2, "Wizard (Fire/Poison)", "위자드 (불/독)", 30,
         "Specializes in fire and poison magic with DoT and area attacks."),
        (3, "Mage (Fire/Poison)", "메이지 (불/독)", 60,
         "Masters advanced fire spells and deadly poison mist techniques."),
        (4, "Arch Mage (Fire/Poison)", "아크메이지 (불/독)", 100,
         "The ultimate fire/poison mage wielding Meteor Shower and Mist Eruption."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Inferno Aura."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Arch Mage (Ice/Lightning)"] = [
        (0, "Beginner", "초보자", 1,
         "A new adventurer beginning their journey in Maple World."),
        (1, "Magician", "마법사", 8,
         "First job advancement into the Magician class with basic magic skills."),
        (2, "Wizard (Ice/Lightning)", "위자드 (썬/콜)", 30,
         "Specializes in ice and lightning magic with freezing and chaining attacks."),
        (3, "Mage (Ice/Lightning)", "메이지 (썬/콜)", 60,
         "Masters advanced ice and thunder spells with crowd control."),
        (4, "Arch Mage (Ice/Lightning)", "아크메이지 (썬/콜)", 100,
         "The ultimate ice/lightning mage wielding Chain Lightning and Blizzard."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Jupiter Thunder."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Bishop"] = [
        (0, "Beginner", "초보자", 1,
         "A new adventurer beginning their journey in Maple World."),
        (1, "Magician", "마법사", 8,
         "First job advancement into the Magician class with basic magic skills."),
        (2, "Cleric", "클레릭", 30,
         "Specializes in holy magic with healing and undead-slaying abilities."),
        (3, "Priest", "프리스트", 60,
         "Masters advanced healing, Holy Symbol for EXP boost, and holy attacks."),
        (4, "Bishop", "비숍", 100,
         "The supreme healer wielding Angel Ray, Resurrection, and Infinity."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Benediction."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    # ================================================================
    # EXPLORERS - Bowman Branch
    # ================================================================
    data["Bowmaster"] = [
        (0, "Beginner", "초보자", 1,
         "A new adventurer beginning their journey in Maple World."),
        (1, "Archer", "궁수", 10,
         "First job advancement into the Archer class with basic bow skills."),
        (2, "Hunter", "헌터", 30,
         "Specializes in bow combat with Arrow Bomb and rapid shooting."),
        (3, "Ranger", "레인저", 60,
         "Masters advanced archery with Arrow Rain and enhanced mobility."),
        (4, "Bowmaster", "보우마스터", 100,
         "The supreme archer wielding Hurricane for the fastest attack in the game."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Silhouette Mirage."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Marksman"] = [
        (0, "Beginner", "초보자", 1,
         "A new adventurer beginning their journey in Maple World."),
        (1, "Archer", "궁수", 10,
         "First job advancement into the Archer class with basic crossbow skills."),
        (2, "Crossbowman", "사수", 30,
         "Specializes in crossbow combat with piercing bolts and range advantage."),
        (3, "Sniper", "저격수", 60,
         "Masters precision shooting with long-range sniping techniques."),
        (4, "Marksman", "신궁", 100,
         "The precision crossbow master wielding Snipe and Piercing Arrow."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Surge Bolt."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Pathfinder"] = [
        (0, "Beginner", "초보자", 1,
         "A new adventurer beginning their journey in Maple World."),
        (1, "Archer", "궁수", 10,
         "First job advancement into the Archer class with ancient bow skills."),
        (2, "Ancient Archer", "에인션트아처", 30,
         "Discovers the ancient bow's power and learns multi-mode arrow skills."),
        (3, "Chaser", "체이서", 60,
         "Masters the three arrow modes: Deluge, Gust, and Blast."),
        (4, "Pathfinder", "패스파인더", 100,
         "The ancient bow wielder commanding Cardinal Deluge and Raven Tempest."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Relic Unbound."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    # ================================================================
    # EXPLORERS - Thief Branch
    # ================================================================
    data["Night Lord"] = [
        (0, "Beginner", "초보자", 1,
         "A new adventurer beginning their journey in Maple World."),
        (1, "Rogue", "로그", 10,
         "First job advancement into the Rogue class with basic stealth skills."),
        (2, "Assassin", "어쌔신", 30,
         "Specializes in throwing star combat with swift ranged assassination."),
        (3, "Hermit", "허밋", 60,
         "Masters shadow techniques, shadow clones, and advanced star throwing."),
        (4, "Night Lord", "나이트로드", 100,
         "The supreme assassin wielding Quad Star and Mark of Assassin."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Throw Blasting."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Shadower"] = [
        (0, "Beginner", "초보자", 1,
         "A new adventurer beginning their journey in Maple World."),
        (1, "Rogue", "로그", 10,
         "First job advancement into the Rogue class with basic stealth skills."),
        (2, "Bandit", "시프", 30,
         "Specializes in dagger combat with stealth and meso-based attacks."),
        (3, "Chief Bandit", "시프마스터", 60,
         "Masters Meso Explosion and advanced shadow stealth techniques."),
        (4, "Shadower", "섀도어", 100,
         "The cunning rogue wielding Assassinate, Meso Explosion, and Dark Sight."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Trickblade."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Dual Blade"] = [
        (0, "Beginner", "초보자", 1,
         "A new adventurer beginning their journey in Maple World."),
        (1, "Rogue", "로그", 10,
         "First job advancement into the Rogue class with basic dual weapon skills."),
        (2, "Blade Recruit", "블레이드 리크루트", 30,
         "Begins training in the secret dual-blade arts with katara techniques."),
        (3, "Blade Specialist", "블레이드 스페셜리스트", 60,
         "Masters advanced dual-wielding combos and aerial blade skills."),
        (4, "Dual Blade", "듀얼블레이드", 100,
         "The supreme dual wielder commanding Phantom Blow and Final Cut."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Blade Tempest."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    # ================================================================
    # EXPLORERS - Pirate Branch
    # ================================================================
    data["Buccaneer"] = [
        (0, "Beginner", "초보자", 1,
         "A new adventurer beginning their journey in Maple World."),
        (1, "Pirate", "해적", 10,
         "First job advancement into the Pirate class with basic knuckle skills."),
        (2, "Brawler", "인파이터", 30,
         "Specializes in knuckle combat with powerful punching techniques."),
        (3, "Marauder", "버커니어", 60,
         "Masters energy charging and transformation-enhanced martial arts."),
        (4, "Buccaneer", "바이퍼", 100,
         "The supreme brawler wielding Octopunch and Power Unity transformation."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Loaded Dice."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Corsair"] = [
        (0, "Beginner", "초보자", 1,
         "A new adventurer beginning their journey in Maple World."),
        (1, "Pirate", "해적", 10,
         "First job advancement into the Pirate class with basic gun skills."),
        (2, "Gunslinger", "건슬링거", 30,
         "Specializes in gun combat with rapid fire and crew summons."),
        (3, "Outlaw", "발키리", 60,
         "Masters advanced gunplay, explosives, and summoned crew members."),
        (4, "Corsair", "캡틴", 100,
         "The pirate captain wielding Rapid Fire, Ugly Bomb, and Broadside."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Loaded Dice."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Cannoneer"] = [
        (0, "Beginner", "초보자", 1,
         "A new adventurer beginning their journey in Maple World."),
        (1, "Pirate", "해적", 10,
         "First job advancement into the Pirate class with basic cannon skills."),
        (2, "Cannoneer", "캐논슈터", 30,
         "Specializes in hand cannon combat with explosive area attacks."),
        (3, "Cannon Trooper", "캐논블래스터", 60,
         "Masters advanced cannon techniques with monkey companions."),
        (4, "Cannon Master", "캐논마스터", 100,
         "The artillery master wielding Cannon Barrage, Monkey Militia, and ICBM."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Loaded Dice."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    # ================================================================
    # CYGNUS KNIGHTS
    # ================================================================
    data["Dawn Warrior"] = [
        (0, "Noblesse", "노블레스", 1,
         "A noble knight candidate serving Empress Cygnus."),
        (1, "Dawn Warrior", "소울마스터", 10,
         "First job as a Knight of Cygnus wielding the power of light."),
        (2, "Dawn Warrior", "소울마스터", 30,
         "Second advancement mastering sun and moon stance basics."),
        (3, "Dawn Warrior", "소울마스터", 60,
         "Third advancement achieving advanced stance-switching swordplay."),
        (4, "Dawn Warrior", "소울마스터", 100,
         "Fourth advancement commanding Equinox Cycle and Sun/Moon dances."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Rift of Damination."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Blaze Wizard"] = [
        (0, "Noblesse", "노블레스", 1,
         "A noble knight candidate serving Empress Cygnus."),
        (1, "Blaze Wizard", "플레임위자드", 10,
         "First job as a Cygnus Knight commanding the fire spirit Ignis."),
        (2, "Blaze Wizard", "플레임위자드", 30,
         "Second advancement learning orbital flame manipulation basics."),
        (3, "Blaze Wizard", "플레임위자드", 60,
         "Third advancement mastering advanced orbital fire patterns."),
        (4, "Blaze Wizard", "플레임위자드", 100,
         "Fourth advancement wielding Orbital Flame and Blazing Extinction."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Savage Flame 12."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Wind Archer"] = [
        (0, "Noblesse", "노블레스", 1,
         "A noble knight candidate serving Empress Cygnus."),
        (1, "Wind Archer", "윈드브레이커", 10,
         "First job as a Cygnus Knight commanding the wind spirit."),
        (2, "Wind Archer", "윈드브레이커", 30,
         "Second advancement learning wind-guided arrow techniques."),
        (3, "Wind Archer", "윈드브레이커", 60,
         "Third advancement mastering trifling wind arrow summons."),
        (4, "Wind Archer", "윈드브레이커", 100,
         "Fourth advancement commanding Song of Heaven and Trifling Wind."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Howling Gale."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Night Walker"] = [
        (0, "Noblesse", "노블레스", 1,
         "A noble knight candidate serving Empress Cygnus."),
        (1, "Night Walker", "나이트워커", 10,
         "First job as a Cygnus Knight embracing the shadow spirit."),
        (2, "Night Walker", "나이트워커", 30,
         "Second advancement learning shadow-infused throwing star techniques."),
        (3, "Night Walker", "나이트워커", 60,
         "Third advancement mastering shadow bat summons and darkness skills."),
        (4, "Night Walker", "나이트워커", 100,
         "Fourth advancement wielding Quintuple Star and Shadow Bat."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Shadow Spear."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Thunder Breaker"] = [
        (0, "Noblesse", "노블레스", 1,
         "A noble knight candidate serving Empress Cygnus."),
        (1, "Thunder Breaker", "스트라이커", 10,
         "First job as a Cygnus Knight channeling the thunder spirit."),
        (2, "Thunder Breaker", "스트라이커", 30,
         "Second advancement learning lightning-infused martial arts basics."),
        (3, "Thunder Breaker", "스트라이커", 60,
         "Third advancement mastering link skill chains and thunder combos."),
        (4, "Thunder Breaker", "스트라이커", 100,
         "Fourth advancement wielding Thunderbolt, Annihilate, and Typhoon."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Thunder God Fist."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Mihile"] = [
        (0, "Noblesse", "노블레스", 1,
         "A noble knight candidate serving Empress Cygnus."),
        (1, "Mihile", "미하일", 10,
         "First job as the captain of the Cygnus Knights with light-based swordplay."),
        (2, "Mihile", "미하일", 30,
         "Second advancement learning shield defense and light sword techniques."),
        (3, "Mihile", "미하일", 60,
         "Third advancement mastering Royal Guard counter-attack system."),
        (4, "Mihile", "미하일", 100,
         "Fourth advancement commanding Royal Guard and Radiant Cross."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Charging Light."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    # ================================================================
    # HEROES
    # ================================================================
    data["Aran"] = [
        (0, "Aran", "아란", 1,
         "A legendary hero reawakened on Rien Island with lost memories."),
        (1, "Aran", "아란", 10,
         "First job relearning basic polearm combat and combo inputs."),
        (2, "Aran", "아란", 30,
         "Second advancement recovering advanced combo attack sequences."),
        (3, "Aran", "아란", 60,
         "Third advancement mastering command-input combo chains and Maha's power."),
        (4, "Aran", "아란", 100,
         "Fourth advancement wielding Beyond Blade and Adrenaline Rush."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Maha's Domain."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Evan"] = [
        (0, "Evan", "에반", 1,
         "A young farm boy who inherits the spirit of Dragon Master Freud."),
        (1, "Evan", "에반", 10,
         "First job bonding with the dragon Mir and learning basic magic."),
        (2, "Evan", "에반", 30,
         "Second advancement learning human-dragon fusion skill basics."),
        (3, "Evan", "에반", 60,
         "Third advancement mastering advanced fusion skills with Mir."),
        (4, "Evan", "에반", 100,
         "Fourth advancement commanding Dragon Breath and Dragon Master."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Dragon Break."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Mercedes"] = [
        (0, "Mercedes", "메르세데스", 1,
         "The Elf Queen awakened from an ancient curse to restore Elluel."),
        (1, "Mercedes", "메르세데스", 10,
         "First job reclaiming basic dual bowgun combat and elven agility."),
        (2, "Mercedes", "메르세데스", 30,
         "Second advancement recovering aerial combo and charging techniques."),
        (3, "Mercedes", "메르세데스", 60,
         "Third advancement mastering advanced aerial combos and elven magic."),
        (4, "Mercedes", "메르세데스", 100,
         "Fourth advancement wielding Ishtar's Ring and Legendary Spear."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Sylvidia's Flight."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Phantom"] = [
        (0, "Phantom", "팬텀", 1,
         "The legendary gentleman thief seeking to avenge his beloved Aria."),
        (1, "Phantom", "팬텀", 10,
         "First job learning basic cane combat and card throwing."),
        (2, "Phantom", "팬텀", 30,
         "Second advancement mastering skill theft from 2nd job Explorers."),
        (3, "Phantom", "팬텀", 60,
         "Third advancement stealing 3rd job skills and advanced cane techniques."),
        (4, "Phantom", "팬텀", 100,
         "Fourth advancement wielding Mille Aiguilles and Impeccable Memory IV."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Joker."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Luminous"] = [
        (0, "Luminous", "루미너스", 1,
         "The mage of light corrupted by darkness after sealing the Black Mage."),
        (1, "Luminous", "루미너스", 10,
         "First job learning to channel light and dark magic alternation."),
        (2, "Luminous", "루미너스", 30,
         "Second advancement mastering light skills and dark skill alternation."),
        (3, "Luminous", "루미너스", 60,
         "Third advancement achieving deeper control over Equilibrium state."),
        (4, "Luminous", "루미너스", 100,
         "Fourth advancement wielding Reflection, Apocalypse, and Equilibrium."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Gate of Light."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Shade"] = [
        (0, "Shade", "은월", 1,
         "The forgotten hero erased from all memory after sealing the Black Mage."),
        (1, "Shade", "은월", 10,
         "First job learning to summon fox spirits for combat."),
        (2, "Shade", "은월", 30,
         "Second advancement mastering spirit claw and bomb punch techniques."),
        (3, "Shade", "은월", 60,
         "Third advancement commanding advanced fox spirit summons."),
        (4, "Shade", "은월", 100,
         "Fourth advancement wielding Spirit Claw, Bomb Punch, and Spirit Gate."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Spirit Flow."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    # ================================================================
    # RESISTANCE
    # ================================================================
    data["Demon Slayer"] = [
        (0, "Demon", "데몬", 1,
         "A demon who betrayed the Black Mage to avenge his murdered family."),
        (1, "Demon Slayer", "데몬슬레이어", 10,
         "First job mastering basic demon fury attacks and dark combat."),
        (2, "Demon Slayer", "데몬슬레이어", 30,
         "Second advancement learning advanced Demon Fury resource management."),
        (3, "Demon Slayer", "데몬슬레이어", 60,
         "Third advancement mastering dark area attacks and demon wings."),
        (4, "Demon Slayer", "데몬슬레이어", 100,
         "Fourth advancement wielding Demon Impact and Infernal Concussion."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Demon Awakening."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Demon Avenger"] = [
        (0, "Demon", "데몬", 1,
         "A demon who betrayed the Black Mage, channeling demonic blood as power."),
        (1, "Demon Avenger", "데몬어벤져", 10,
         "First job learning HP-scaling combat and Exceed system basics."),
        (2, "Demon Avenger", "데몬어벤져", 30,
         "Second advancement mastering Exceed skill chains and life drain."),
        (3, "Demon Avenger", "데몬어벤져", 60,
         "Third advancement achieving advanced Exceed overcharge mechanics."),
        (4, "Demon Avenger", "데몬어벤져", 100,
         "Fourth advancement wielding Nether Shield and Exceed: Execution."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Demonic Frenzy."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Battle Mage"] = [
        (0, "Citizen", "시민", 1,
         "A citizen of Edelstein living under Black Wings occupation."),
        (1, "Battle Mage", "배틀메이지", 10,
         "First job joining the Resistance as a close-combat mage."),
        (2, "Battle Mage", "배틀메이지", 30,
         "Second advancement learning aura system and telecast mechanics."),
        (3, "Battle Mage", "배틀메이지", 60,
         "Third advancement mastering advanced aura switching and dark arts."),
        (4, "Battle Mage", "배틀메이지", 100,
         "Fourth advancement wielding Dark Genesis and Battle Aura mastery."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Grim Harvest."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Wild Hunter"] = [
        (0, "Citizen", "시민", 1,
         "A citizen of Edelstein living under Black Wings occupation."),
        (1, "Wild Hunter", "와일드헌터", 10,
         "First job joining the Resistance as a mounted crossbow fighter."),
        (2, "Wild Hunter", "와일드헌터", 30,
         "Second advancement bonding with the jaguar and learning mounted combat."),
        (3, "Wild Hunter", "와일드헌터", 60,
         "Third advancement mastering jaguar riding, summons, and multi-target shots."),
        (4, "Wild Hunter", "와일드헌터", 100,
         "Fourth advancement wielding Wild Arrow Blast and Jaguar Storm."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Primal Fury."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Mechanic"] = [
        (0, "Citizen", "시민", 1,
         "A citizen of Edelstein living under Black Wings occupation."),
        (1, "Mechanic", "메카닉", 10,
         "First job joining the Resistance as a mech-suit engineer."),
        (2, "Mechanic", "메카닉", 30,
         "Second advancement upgrading the mech suit and deploying support robots."),
        (3, "Mechanic", "메카닉", 60,
         "Third advancement mastering advanced robot deployment and mech weapons."),
        (4, "Mechanic", "메카닉", 100,
         "Fourth advancement wielding Heavy Salvo Plus and Robot Mastery."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Full Spread."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Blaster"] = [
        (0, "Citizen", "시민", 1,
         "A citizen of Edelstein living under Black Wings occupation."),
        (1, "Blaster", "블래스터", 10,
         "First job joining the Resistance with experimental arm cannons."),
        (2, "Blaster", "블래스터", 30,
         "Second advancement learning charge-based combo and reload systems."),
        (3, "Blaster", "블래스터", 60,
         "Third advancement mastering rocket-propelled mobility and advanced combos."),
        (4, "Blaster", "블래스터", 100,
         "Fourth advancement wielding Magnum Punch and Rocket Punch."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Afterimage Shock."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Xenon"] = [
        (0, "Xenon", "제논", 1,
         "A cyborg hybrid who escaped the Black Wings' Gelimer."),
        (1, "Xenon", "제논", 10,
         "First job learning energy sword basics and hybrid stat combat."),
        (2, "Xenon", "제논", 30,
         "Second advancement mastering multi-mode combat and energy weapons."),
        (3, "Xenon", "제논", 60,
         "Third advancement achieving advanced cybernetic combat with Multilateral."),
        (4, "Xenon", "제논", 100,
         "Fourth advancement wielding Beam Dance and Mecha Purge."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Omega Blaster."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    # ================================================================
    # NOVA
    # ================================================================
    data["Kaiser"] = [
        (0, "Kaiser", "카이저", 1,
         "A Nova dragon warrior inheritor from the world of Grandis."),
        (1, "Kaiser", "카이저", 10,
         "First job awakening the dragon warrior power with basic sword skills."),
        (2, "Kaiser", "카이저", 30,
         "Second advancement learning dragon transformation and Morph Gauge."),
        (3, "Kaiser", "카이저", 60,
         "Third advancement mastering intermediate dragon form and wing skills."),
        (4, "Kaiser", "카이저", 100,
         "Fourth advancement wielding Final Form and Gigas Wave."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Dragon Barrage."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Angelic Buster"] = [
        (0, "Angelic Buster", "엔젤릭버스터", 1,
         "A young Nova girl Tear who transforms into the idol hero Angelic Buster."),
        (1, "Angelic Buster", "엔젤릭버스터", 10,
         "First job forming a pact with Eskalade and learning soul energy attacks."),
        (2, "Angelic Buster", "엔젤릭버스터", 30,
         "Second advancement mastering soul shooter techniques and pop-star skills."),
        (3, "Angelic Buster", "엔젤릭버스터", 60,
         "Third advancement achieving advanced soul energy manipulation."),
        (4, "Angelic Buster", "엔젤릭버스터", 100,
         "Fourth advancement wielding Soul Seeker, Trinity, and Finale Ribbon."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Supreme Supernova."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Cadena"] = [
        (0, "Cadena", "카데나", 1,
         "A Nova street fighter raised in the slums of Savage Terminal."),
        (1, "Cadena", "카데나", 10,
         "First job learning basic chain combat and weapon switching."),
        (2, "Cadena", "카데나", 30,
         "Second advancement mastering chain combo basics with multiple weapons."),
        (3, "Cadena", "카데나", 60,
         "Third advancement achieving advanced freestyle combo chains."),
        (4, "Cadena", "카데나", 100,
         "Fourth advancement wielding Chain Arts: Fury and Maelstrom."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Chain Arts: Crush."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    # ================================================================
    # FLORA
    # ================================================================
    data["Illium"] = [
        (0, "Illium", "일리움", 1,
         "A young Flora mage bonded with the ancient Crystal of Aether."),
        (1, "Illium", "일리움", 10,
         "First job learning crystal magic and basic lucent gauntlet skills."),
        (2, "Illium", "일리움", 30,
         "Second advancement mastering crystal constructs and flight mechanics."),
        (3, "Illium", "일리움", 60,
         "Third advancement achieving advanced crystal gate deployment and reactions."),
        (4, "Illium", "일리움", 100,
         "Fourth advancement wielding Javelin and Reaction: Domination."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Crystal Gate: Unlimited."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Adele"] = [
        (0, "Adele", "아델", 1,
         "A Flora knight awakened from centuries of sealment with fragmented memories."),
        (1, "Adele", "아델", 10,
         "First job learning basic Aether sword summoning and bladecaster combat."),
        (2, "Adele", "아델", 30,
         "Second advancement mastering telekinetic sword control and Aether skills."),
        (3, "Adele", "아델", 60,
         "Third advancement commanding multiple ethereal swords simultaneously."),
        (4, "Adele", "아델", 100,
         "Fourth advancement wielding Cleave, Hunting Decree, and Aether Forge."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Storm."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    # ================================================================
    # ANIMA
    # ================================================================
    data["Hoyoung"] = [
        (0, "Hoyoung", "호영", 1,
         "A mischievous Anima sage who accidentally released a dangerous fiend."),
        (1, "Hoyoung", "호영", 10,
         "First job learning basic Taoist arts and fan combat."),
        (2, "Hoyoung", "호영", 30,
         "Second advancement mastering heaven, earth, and humanity gauge system."),
        (3, "Hoyoung", "호영", 60,
         "Third advancement achieving advanced elemental stance switching."),
        (4, "Hoyoung", "호영", 100,
         "Fourth advancement wielding Consuming Flames and Clone: Rampage."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Wrath of Gods."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Lara"] = [
        (0, "Lara", "라라", 1,
         "A gentle Anima girl from the mountains who hears nature spirits."),
        (1, "Lara", "라라", 10,
         "First job learning to channel mountain spirits through a magical bell."),
        (2, "Lara", "라라", 30,
         "Second advancement mastering nature spirit communication and bell magic."),
        (3, "Lara", "라라", 60,
         "Third advancement commanding multiple nature spirits for healing and damage."),
        (4, "Lara", "라라", 100,
         "Fourth advancement wielding Mountain Spirit Eruption and Nature's Embrace."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Mountain Kids."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Kain"] = [
        (0, "Kain", "카인", 1,
         "A cursed Drakas Anima gunslinger fighting to control inner malice."),
        (1, "Kain", "카인", 10,
         "First job learning malice-fueled whispershot and charm combat."),
        (2, "Kain", "카인", 30,
         "Second advancement mastering malice gauge management and ranged attacks."),
        (3, "Kain", "카인", 60,
         "Third advancement achieving advanced malice suppression and Drakas power."),
        (4, "Kain", "카인", 100,
         "Fourth advancement wielding Death Blessing and Dragon Burst."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Thanatos Descent."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    # ================================================================
    # CHILD OF GOD
    # ================================================================
    data["Zero"] = [
        (0, "Zero", "제로", 100,
         "Twin siblings Alpha and Beta, children of the Transcendent of Time."),
        (1, "Zero (Alpha)", "제로 (알파)", 100,
         "Chapter 1: Alpha awakens in Mirror World wielding the Long Sword."),
        (2, "Zero (Beta)", "제로 (베타)", 110,
         "Chapter 2: Beta joins the battle wielding the Heavy Sword."),
        (3, "Zero", "제로", 130,
         "Chapter 3: Alpha and Beta master tag-team switching combat."),
        (4, "Zero", "제로", 160,
         "Chapter 4: Full mastery of dual weapon system with Time Holding."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Shadow Rain."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    # ================================================================
    # OTHER
    # ================================================================
    data["Kinesis"] = [
        (0, "Kinesis", "키네시스", 1,
         "A high school psychic from modern-day Seoul pulled into Maple World."),
        (1, "Kinesis", "키네시스", 10,
         "First job learning basic telekinetic combat and object manipulation."),
        (2, "Kinesis", "키네시스", 30,
         "Second advancement mastering psychic point management and projectile hurling."),
        (3, "Kinesis", "키네시스", 60,
         "Third advancement achieving advanced gravity control and psychic storms."),
        (4, "Kinesis", "키네시스", 100,
         "Fourth advancement wielding Psychic Grab and Ultimate: Trainwreck."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Law of Gravity."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Hayato"] = [
        (0, "Hayato", "하야토", 1,
         "A wandering samurai from Zipangu who crossed dimensions to Maple World."),
        (1, "Hayato", "하야토", 10,
         "First job learning basic katana battoujutsu sword techniques."),
        (2, "Hayato", "하야토", 30,
         "Second advancement mastering sword energy gauge and drawing techniques."),
        (3, "Hayato", "하야토", 60,
         "Third advancement achieving advanced iaijutsu and multi-hit combos."),
        (4, "Hayato", "하야토", 100,
         "Fourth advancement wielding Shinsoku and Iaijutsu: Phantom Blade."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Falcons Honor."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Kanna"] = [
        (0, "Kanna", "카나", 1,
         "A shrine maiden from Zipangu who commands spirits and yokai."),
        (1, "Kanna", "카나", 10,
         "First job learning basic spirit summoning and fan combat."),
        (2, "Kanna", "카나", 30,
         "Second advancement mastering Kishin spirit summons and mana recovery."),
        (3, "Kanna", "카나", 60,
         "Third advancement commanding advanced spiritual barriers and yokai."),
        (4, "Kanna", "카나", 100,
         "Fourth advancement wielding Vanquisher's Charm and Spirit Domain."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Spirit's Domain."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Beast Tamer"] = [
        (0, "Beast Tamer", "비스트테이머", 1,
         "A cheerful girl named Chase who can communicate with animals."),
        (1, "Beast Tamer", "비스트테이머", 10,
         "First job befriending Fort the bear for melee combat."),
        (2, "Beast Tamer", "비스트테이머", 30,
         "Second advancement gaining Lai the snow leopard for mobility combat."),
        (3, "Beast Tamer", "비스트테이머", 60,
         "Third advancement gaining Eka the hawk for aerial support and Arby the cat."),
        (4, "Beast Tamer", "비스트테이머", 100,
         "Fourth advancement mastering all four animal companions."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Champ Charge."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Mo Xuan"] = [
        (0, "Mo Xuan", "묵현", 1,
         "A scholarly mage practicing ancient calligraphic arts from the East."),
        (1, "Mo Xuan", "묵현", 10,
         "First job learning basic ink-brush magic and calligraphic techniques."),
        (2, "Mo Xuan", "묵현", 30,
         "Second advancement mastering ink manipulation and brush stroke attacks."),
        (3, "Mo Xuan", "묵현", 60,
         "Third advancement commanding living paintings and advanced calligraphy."),
        (4, "Mo Xuan", "묵현", 100,
         "Fourth advancement wielding Ink Splash and Calligraphy Strike."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Masterwork."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    data["Lynn"] = [
        (0, "Lynn", "린", 1,
         "A traveling martial artist who wields a glaive with graceful movements."),
        (1, "Lynn", "린", 10,
         "First job learning basic glaive combat and flowing martial arts."),
        (2, "Lynn", "린", 30,
         "Second advancement mastering glaive sweep techniques and aerial skills."),
        (3, "Lynn", "린", 60,
         "Third advancement achieving advanced martial arts combinations."),
        (4, "Lynn", "린", 100,
         "Fourth advancement wielding Glaive Sweep, Rising Dragon, and Falling Blossom."),
        (5, "V Matrix", "V 매트릭스", 200,
         "Fifth job unlocking V Matrix node system and Moon Dance."),
        (6, "HEXA Matrix", "HEXA 매트릭스", 260,
         "Sixth job unlocking HEXA Matrix origin and mastery skills."),
    ]

    return data


def main():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Verify DB state
    cur.execute("SELECT COUNT(*) FROM job_advancements")
    existing = cur.fetchone()[0]
    if existing > 0:
        print(f"WARNING: job_advancements already has {existing} rows.")
        print("Clearing existing data before inserting...")
        cur.execute("DELETE FROM job_advancements")
        conn.commit()

    # Get job class ID mapping
    job_map = get_job_map(cur)
    print(f"Found {len(job_map)} job classes in database.")

    # Build advancement data
    advancements = build_advancements()

    # Verify all job classes are covered
    missing = set(job_map.keys()) - set(advancements.keys())
    if missing:
        print(f"ERROR: Missing advancement data for: {missing}")
        conn.close()
        return

    extra = set(advancements.keys()) - set(job_map.keys())
    if extra:
        print(f"WARNING: Extra advancement data not in DB: {extra}")

    # Insert data
    insert_sql = """
        INSERT INTO job_advancements
            (job_class_id, advancement_level, name, name_ko, level_required, description)
        VALUES (?, ?, ?, ?, ?, ?)
    """

    rows = []
    for job_name, advs in advancements.items():
        if job_name not in job_map:
            continue
        job_id = job_map[job_name]
        for adv_level, name, name_ko, level_req, desc in advs:
            rows.append((job_id, adv_level, name, name_ko, level_req, desc))

    cur.executemany(insert_sql, rows)
    conn.commit()

    # Verify
    cur.execute("SELECT COUNT(*) FROM job_advancements")
    total = cur.fetchone()[0]
    print(f"Inserted {len(rows)} rows into job_advancements.")
    print(f"Total rows in job_advancements: {total}")

    # Summary by branch
    cur.execute("""
        SELECT jc.branch, COUNT(ja.id) as adv_count
        FROM job_advancements ja
        JOIN job_classes jc ON ja.job_class_id = jc.id
        GROUP BY jc.branch
        ORDER BY adv_count DESC
    """)
    print("\nAdvancements by branch:")
    for branch, count in cur.fetchall():
        print(f"  {branch}: {count}")

    # Verify a sample
    cur.execute("""
        SELECT ja.advancement_level, ja.name, ja.name_ko, ja.level_required
        FROM job_advancements ja
        JOIN job_classes jc ON ja.job_class_id = jc.id
        WHERE jc.name = 'Hero'
        ORDER BY ja.advancement_level
    """)
    print("\nSample - Hero advancement path:")
    for level, name, name_ko, req in cur.fetchall():
        print(f"  Lv.{req:>3} | {level}차 전직: {name} ({name_ko})")

    conn.close()
    print("\nDone!")


if __name__ == "__main__":
    main()
