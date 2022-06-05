---
title: How Minecraft Stores Crafting Recipes
subtitle: Or things noticed while stealing Mojang's work for marks
date: 2022-03-31
---

As of Minecraft version 1.18.1, there are 739 crafting recipes in the game...depending on how you count.  This little rabbithole is something I fell into during a meeting for a group project this week.  The project tasks us with building a "daily puzzle game" in vein of Wordle, as my web development unit likes the idea of looking anacronistic in a few years.


The meeting was very preliminary, essentially just getting to know one another and bounce some ideas off each other.  One idea I had been mulling over was "Wordle but with for Minecraft crafting recipes", which requires no explanation for players of these two games (which among my peers includes everyone).  My group immediately latched onto the idea, but acknowledged the scope of including all Minecraft recipes would be challenge, both in terms of game design and actually acquiring them.

Transcribing by hand was possible but likely impractical, as was automatically scraping the [wiki](https://minecraft.fandom.com/wiki/Minecraft_Wiki).  Luckily, the thousands of modders before us had poured through Minecraft's source file and through [cursory googling](https://gaming.stackexchange.com/questions/382431/list-of-all-minecraft-crafting-recipes-for-crafting-web) we were able to get to `.minecraft/versions/1.18.1.jar/data/minecraft/recipes/`, where all crafting recipes in the game are stored as lovely little JSON files.  Perfect!  

Upon further inspection there are some mildly interesting quirks within these JSON files.  The majority of recipes vaguely follow this format:

```json
{
  "type": "minecraft:crafting_shaped",
  "pattern": [
    "###",
    "#X#",
    "#R#"
  ],
  "key": {
    "R": {
      "item": "minecraft:redstone"
    },
    "#": {
      "item": "minecraft:cobblestone"
    },
    "X": {
      "item": "minecraft:bow"
    }
  },
  "result": {
    "item": "minecraft:dispenser"
  }
}
```

Seems like a straightforward and logical way of laying it all out.  Presumably the "type" being "crafting_shaped" is to denote recipes with particular shapes (like a dispenser) as different from recipes where block arrangment doesn't matter (like mushroom stew).

Shapeless crafting recipes follow a simpler format:

```json
{
  "type": "minecraft:crafting_shapeless",
  "ingredients": [
    {
      "item": "minecraft:brown_mushroom"
    },
    {
      "item": "minecraft:red_mushroom"
    },
    {
      "item": "minecraft:bowl"
    }
  ],
  "result": {
    "item": "minecraft:mushroom_stew"
  }
}
```

The recipes folder contains a lot more than two types though:

```zsh
zach@grannysmith recipes % awk 'FNR == 2' *.json | sort | uniq -c
  24   "type": "minecraft:blasting",
   9   "type": "minecraft:campfire_cooking",
 543   "type": "minecraft:crafting_shaped",
 183   "type": "minecraft:crafting_shapeless",
   1   "type": "minecraft:crafting_special_armordye"
   1   "type": "minecraft:crafting_special_bannerduplicate"
   1   "type": "minecraft:crafting_special_bookcloning"
   1   "type": "minecraft:crafting_special_firework_rocket"
   1   "type": "minecraft:crafting_special_firework_star"
   1   "type": "minecraft:crafting_special_firework_star_fade"
   1   "type": "minecraft:crafting_special_mapcloning"
   1   "type": "minecraft:crafting_special_mapextending"
   1   "type": "minecraft:crafting_special_repairitem"
   1   "type": "minecraft:crafting_special_shielddecoration"
   1   "type": "minecraft:crafting_special_shulkerboxcoloring"
   1   "type": "minecraft:crafting_special_suspiciousstew"
   1   "type": "minecraft:crafting_special_tippedarrow"
  70   "type": "minecraft:smelting",
   9   "type": "minecraft:smithing",
   9   "type": "minecraft:smoking",
 198   "type": "minecraft:stonecutting",
```

Hold on, that's not just crafting recipes!  All kinds "recipes" are stored in this directory, from normal smoking to smithing.  This explains the repeated entries for items like cooked porkchop.

```zsh
zach@grannysmith recipes % ls cooked*.json
cooked_beef.json                           cooked_mutton_from_smoking.json
cooked_beef_from_campfire_cooking.json     cooked_porkchop.json
cooked_beef_from_smoking.json              cooked_porkchop_from_campfire_cooking.json
cooked_chicken.json                        cooked_porkchop_from_smoking.json
cooked_chicken_from_campfire_cooking.json  cooked_rabbit.json
cooked_chicken_from_smoking.json           cooked_rabbit_from_campfire_cooking.json
cooked_cod.json                            cooked_rabbit_from_smoking.json
cooked_cod_from_campfire_cooking.json      cooked_salmon.json
cooked_cod_from_smoking.json               cooked_salmon_from_campfire_cooking.json
cooked_mutton.json                         cooked_salmon_from_smoking.json
cooked_mutton_from_campfire_cooking.json
```

Smelted items have an even simpler format:

```json
{
  "type": "minecraft:smelting",
  "ingredient": {
    "item": "minecraft:porkchop"
  },
  "result": "minecraft:cooked_porkchop",
  "experience": 0.35,
  "cookingtime": 200
}
```

Puzzingly there is a value for cooking time for each item, though smelting time is dependent on the type of furnace used rather than the item being smelted.

For example, all items cooked in a blast furnace have the same value for cooking time:

```zsh
zach@grannysmith recipes % cat *blast* | grep "cookingtime"
  "cookingtime": 100
  "cookingtime": 100
  "cookingtime": 100
  "cookingtime": 100
  "cookingtime": 100
  "cookingtime": 100
  "cookingtime": 100
  "cookingtime": 100
  "cookingtime": 100
  "cookingtime": 100
  "cookingtime": 100
  "cookingtime": 100
  "cookingtime": 100
  "cookingtime": 100
  "cookingtime": 100
  "cookingtime": 100
  "cookingtime": 100
  "cookingtime": 100
  "cookingtime": 100
  "cookingtime": 100
  "cookingtime": 100
  "cookingtime": 100
  "cookingtime": 100
  "cookingtime": 100
```

It could be to accomodate varying smelting times in the future, but for the moment this seems redundant.

All of the special crafting recipes aren't stored at all, which makes sense since these are more complex than what should be written in a single JSON file.

```zsh
zach@grannysmith recipes % cat $(grep -lr . -e "special")
{
  "type": "minecraft:crafting_special_bookcloning"
}{
  "type": "minecraft:crafting_special_firework_star_fade"
}{
  "type": "minecraft:crafting_special_firework_rocket"
}{
  "type": "minecraft:crafting_special_shulkerboxcoloring"
}{
  "type": "minecraft:crafting_special_mapcloning"
}{
  "type": "minecraft:crafting_special_repairitem"
}{
  "type": "minecraft:crafting_special_bannerduplicate"
}{
  "type": "minecraft:crafting_special_armordye"
}{
  "type": "minecraft:crafting_special_tippedarrow"
}{
  "type": "minecraft:crafting_special_firework_star"
}{
  "type": "minecraft:crafting_special_mapextending"
}{
  "type": "minecraft:crafting_special_shielddecoration"
}{
  "type": "minecraft:crafting_special_suspiciousstew"
}
```

Tools smithed with netherite get a different and simple format as well:
```json
netherite_sword_smithing.json
{
  "type": "minecraft:smithing",
  "base": {
    "item": "minecraft:diamond_sword"
  },
  "addition": {
    "item": "minecraft:netherite_ingot"
  },
  "result": {
    "item": "minecraft:netherite_sword"
  }
}
```

Stonecutting unveiled an interesting quirk: 

```json
chiseled_stone_bricks_stone_from_stonecutting.json
{
  "type": "minecraft:stonecutting",
  "ingredient": {
    "item": "minecraft:stone"
  },
  "result": "minecraft:chiseled_stone_bricks",
  "count": 1
}
```

The count value determine how many items are output by the recipe, and appears in over 579 total recipes.  For the standard crafting recipes this value only appears for recipes that output more than 1 item, but curiously stonecutter recipes always include this value.

All this elicited a nose exhale and an "oh neat" from me as I poked around the files.  Most of these details aren't important to the project, but the parts that are  important will be a huge time save.  Web scraping in my experience is a pain (though somehow I think the maintainers of the Minecraft wiki would be more consistent than the [WA Government](https://github.com/pavo-etc/wa-covid-tracker/blob/1e1e8e317084e22aba6c143afbe9a8249e6231dc/scraper.py#L29)).

Now we can focus on the real trouble - every other aspect of puzzle game design and web development.  I am particularly not looking forward to dealing with the interaction between Wordle-style position hints and different crafting orientation/positions.

**Update 2022-06-05:**

Minecraftle is [playable](https://minecraftle.zachmanson.com) and nearly fully finished.  We submitted two weeks ago but there are a few things I want to implement for my own interest.  The JSON files discussed in this post were used, but their format was inconvenient for querying so needed to be restructured. Yesterday I rewrote the script to restructure the recipe JSON files since the initial version was a mess, and finally implemented the functions to validate recipes on object placement.  These changes revealed a few more quirks in the recipe JSON files.

Some recipes have multiple forms, such as torches which use coal or charcoal.  I had assumed this would just result in two seperate recipe files, but:

```json
> cat torch.json 
{
  "type": "minecraft:crafting_shaped",
  "pattern": [
    "X",
    "#"
  ],
  "key": {
    "#": {
      "item": "minecraft:stick"
    },
    "X": [
      {
        "item": "minecraft:coal"
      },
      {
        "item": "minecraft:charcoal"
      }
    ]
  },
  "result": {
    "item": "minecraft:torch",
    "count": 4
  }
}
```

This actually caused a mild issue in Minecraftle that I currently have a hacky solution for.  As far as I can tell this doesn't appear in many recipes (though I'm too lazy to write the regex to check).  When we restructure the JSON files, we simplify the format so the `pattern` field contains the actual item names rather than character representations.  This doesn't leave much room alternate forms, short of just repeating the whole recipe with the differing items.  While totally possible, I just forced it to select the first item whenever there are multiple options.  This means that you would be unable to craft a torch with charcoal.

As far as I can tell this poses no issues since in Minecraftle's current form you don't receive charcoal as a crafting ingredient, and I am yet to find another appearance of this format that uses the items in `given_ingredients.json`. I'm still uncomfortable with this though, and I hope to come back and fix it after exams.

Another oddity reared its head with stone tools:
```json
> cat stone_axe.json 
{
  "type": "minecraft:crafting_shaped",
  "pattern": [
    "XX",
    "X#",
    " #"
  ],
  "key": {
    "#": {
      "item": "minecraft:stick"
    },
    "X": {
      "tag": "minecraft:stone_tool_materials"
    }
  },
  "result": {
    "item": "minecraft:stone_axe"
  }
}
```

See it? `tag` replaces `item` in a number of cases, such as stone tools.  Blackstone and cobbled deepslate have been added fairly recently to the game, and can be used for interchangably for cobblestone in a number of recipes.  This kind of notation appears in a number of recipes:

```sh
> grep  "\"tag\":" *
acacia_planks.json:      "tag": "minecraft:acacia_logs"
barrel.json:      "tag": "minecraft:planks"
barrel.json:      "tag": "minecraft:wooden_slabs"
beehive.json:      "tag": "minecraft:planks"
birch_planks.json:      "tag": "minecraft:birch_logs"
black_bed.json:      "tag": "minecraft:planks"
blue_bed.json:      "tag": "minecraft:planks"
bookshelf.json:      "tag": "minecraft:planks"
bowl.json:      "tag": "minecraft:planks"
brewing_stand.json:      "tag": "minecraft:stone_crafting_materials"
brown_bed.json:      "tag": "minecraft:planks"
campfire.json:      "tag": "minecraft:logs"
campfire.json:      "tag": "minecraft:coals"
cartography_table.json:      "tag": "minecraft:planks"
chest.json:      "tag": "minecraft:planks"
composter.json:      "tag": "minecraft:wooden_slabs"
crafting_table.json:      "tag": "minecraft:planks"
crimson_planks.json:      "tag": "minecraft:crimson_stems"
cyan_bed.json:      "tag": "minecraft:planks"
dark_oak_planks.json:      "tag": "minecraft:dark_oak_logs"
daylight_detector.json:      "tag": "minecraft:wooden_slabs"
fletching_table.json:      "tag": "minecraft:planks"
furnace.json:      "tag": "minecraft:stone_crafting_materials"
gray_bed.json:      "tag": "minecraft:planks"
green_bed.json:      "tag": "minecraft:planks"
grindstone.json:      "tag": "minecraft:planks"
jukebox.json:      "tag": "minecraft:planks"
jungle_planks.json:      "tag": "minecraft:jungle_logs"
lectern.json:      "tag": "minecraft:wooden_slabs"
light_blue_bed.json:      "tag": "minecraft:planks"
light_gray_bed.json:      "tag": "minecraft:planks"
lime_bed.json:      "tag": "minecraft:planks"
loom.json:      "tag": "minecraft:planks"
magenta_bed.json:      "tag": "minecraft:planks"
note_block.json:      "tag": "minecraft:planks"
oak_planks.json:      "tag": "minecraft:oak_logs"
orange_bed.json:      "tag": "minecraft:planks"
painting.json:      "tag": "minecraft:wool"
pink_bed.json:      "tag": "minecraft:planks"
piston.json:      "tag": "minecraft:planks"
purple_bed.json:      "tag": "minecraft:planks"
red_bed.json:      "tag": "minecraft:planks"
shield.json:      "tag": "minecraft:planks"
smithing_table.json:      "tag": "minecraft:planks"
smoker.json:      "tag": "minecraft:logs"
soul_campfire.json:      "tag": "minecraft:logs"
soul_campfire.json:      "tag": "minecraft:soul_fire_base_blocks"
soul_torch.json:      "tag": "minecraft:soul_fire_base_blocks"
spruce_planks.json:      "tag": "minecraft:spruce_logs"
stick.json:      "tag": "minecraft:planks"
stone_axe.json:      "tag": "minecraft:stone_tool_materials"
stone_hoe.json:      "tag": "minecraft:stone_tool_materials"
stone_pickaxe.json:      "tag": "minecraft:stone_tool_materials"
stone_shovel.json:      "tag": "minecraft:stone_tool_materials"
stone_sword.json:      "tag": "minecraft:stone_tool_materials"
tripwire_hook.json:      "tag": "minecraft:planks"
warped_planks.json:      "tag": "minecraft:warped_stems"
white_bed.json:      "tag": "minecraft:planks"
wooden_axe.json:      "tag": "minecraft:planks"
wooden_hoe.json:      "tag": "minecraft:planks"
wooden_pickaxe.json:      "tag": "minecraft:planks"
wooden_shovel.json:      "tag": "minecraft:planks"
wooden_sword.json:      "tag": "minecraft:planks"
yellow_bed.json:      "tag": "minecraft:planks"
```

These tags are referring to `.minecraft/versions/1.18.1.jar/data/minecraft/tags/items/`, which holds yet more JSON files with lists of all items that belong to each tag.  For example:

```json
> cat stone_crafting_materials.json
{
  "replace": false,
  "values": [
    "minecraft:cobblestone",
    "minecraft:blackstone",
    "minecraft:cobbled_deepslate"
  ]
}
```

To deal with these I've currently just put edge cases in to handle these tags manually, though I would like to have a more robust solution in the future that can be determined by `given_ingredients.json`.

Recipe validation was the final feature I really felt was necessary for my own sense of completion.  That said, we never added shapeless recipe support...or varying difficulties...or hardcore mode.  Oh well.