"""Export the original Unity visuals used by the browser port.

This script intentionally copies/crops only source assets supplied in the Unity
project. It never redraws or generates replacement art.
"""

from pathlib import Path
from shutil import copy2, which
import subprocess
from PIL import Image, ImageOps

PROJECT = Path(__file__).resolve().parents[1]
UNITY = PROJECT / "BertTheBird" / "Assets"
OUTPUT = PROJECT / "webapp" / "assets" / "unity"


def copy_asset(source_relative: str, target_relative: str | None = None) -> None:
    source = UNITY / source_relative
    target = OUTPUT / (target_relative or source.name)
    if not source.exists():
        raise FileNotFoundError(source)
    target.parent.mkdir(parents=True, exist_ok=True)
    copy2(source, target)


def crop_unity_sprite(source_relative: str, target_relative: str, x: int, y: int, width: int, height: int) -> None:
    """Crop Unity coordinates, whose origin is bottom-left, to a PNG file."""
    source = UNITY / source_relative
    target = OUTPUT / target_relative
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source).convert("RGBA") as image:
        top = image.height - y - height
        sprite = image.crop((x, top, x + width, top + height))
        sprite.save(target)


def crop_top_left(source_relative: str, target_relative: str, box: tuple[int, int, int, int]) -> None:
    source = UNITY / source_relative
    target = OUTPUT / target_relative
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source).convert("RGBA") as image:
        image.crop(box).save(target)


def tint_asset(source_relative: str, target_relative: str, shadow: str, highlight: str) -> None:
    """Recolor supplied artwork while preserving its authored shading and alpha."""
    source = UNITY / source_relative
    target = OUTPUT / target_relative
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source).convert("RGBA") as image:
        alpha = image.getchannel("A")
        luminance = ImageOps.grayscale(image)
        tinted = ImageOps.colorize(luminance, black=shadow, white=highlight).convert("RGBA")
        tinted.putalpha(alpha)
        tinted.save(target)


def create_pwa_icon(size: int) -> None:
    """Compose an install icon exclusively from original Unity artwork."""
    sky_source = UNITY / "LevelAtlases/Level1/Images/Level1_SKY.jpg"
    bird_source = UNITY / "GUI/Atlas/Textures/MenuBird.png"
    target = PROJECT / "webapp" / "icons" / f"bert-{size}.png"
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(sky_source).convert("RGBA") as sky, Image.open(bird_source).convert("RGBA") as bird:
        square_side = min(sky.size)
        left = (sky.width - square_side) // 2
        background = sky.crop((left, 0, left + square_side, square_side)).resize((size, size), Image.Resampling.LANCZOS)
        bird.thumbnail((int(size * 0.84), int(size * 0.84)), Image.Resampling.LANCZOS)
        x = (size - bird.width) // 2
        y = (size - bird.height) // 2 + int(size * 0.035)
        background.alpha_composite(bird, (x, y))
        background.save(target)


def create_stream_audio(source_relative: str, target_relative: str) -> None:
    """Transcode supplied Unity music to a compact iOS-safe stream."""
    source = UNITY / source_relative
    target = OUTPUT / target_relative
    target.parent.mkdir(parents=True, exist_ok=True)
    if which("ffmpeg") is None:
        if not target.exists():
            raise RuntimeError("ffmpeg is required to create audio/chopin.mp3")
        return
    subprocess.run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(source),
        "-codec:a", "libmp3lame", "-b:a", "160k", str(target),
    ], check=True)


def create_level_five_preview() -> None:
    """Build the missing Level 5 menu preview from its original parallax art."""
    canvas = Image.new("RGBA", (1280, 720), (102, 204, 229, 255))
    layers = [
        ("LevelAtlases/Level5/Textures/sky.png", 0, 720),
        ("LevelAtlases/Level5/Textures/bg.png", 556, 164),
        ("LevelAtlases/Level5/Textures/mg.png", 472, 155),
    ]
    for source_relative, y, height in layers:
        with Image.open(UNITY / source_relative).convert("RGBA") as source:
            width = max(1, round(source.width / source.height * height))
            tile = source.resize((width, height), Image.Resampling.LANCZOS)
            x = 0
            while x < canvas.width:
                canvas.alpha_composite(tile, (x, y))
                x += width
    with Image.open(UNITY / "LevelAtlases/Level5/props/textures/rainbow_normal.png").convert("RGBA") as source:
        rainbow_width = 700
        rainbow_height = round(source.height / source.width * rainbow_width)
        rainbow = source.resize((rainbow_width, rainbow_height), Image.Resampling.LANCZOS)
        canvas.alpha_composite(rainbow, ((canvas.width - rainbow_width) // 2, canvas.height - rainbow_height + 34))
    target = OUTPUT / "ui" / "level-5.png"
    target.parent.mkdir(parents=True, exist_ok=True)
    canvas.resize((398, 221), Image.Resampling.LANCZOS).save(target)


# Bert's exact 14-frame Unity sprite sequence. The original fly.anim plays
# frames 0–12 at 24 FPS and the final frame is the dead state.
BIRD_SOURCE = "Animations/Skin Animations/00 - Bert/RECOVER_bird.png"
BIRD_RECTS = [
    (0, 1684, 396, 361), (396, 1684, 396, 361), (792, 1684, 396, 361),
    (1188, 1684, 396, 361), (1584, 1684, 396, 361), (0, 1323, 396, 361),
    (396, 1323, 396, 361), (792, 1323, 396, 361), (1188, 1323, 396, 361),
    (1584, 1323, 396, 361), (0, 962, 396, 361), (396, 962, 396, 360),
    (792, 962, 396, 361), (1188, 962, 396, 361),
]

for index, rect in enumerate(BIRD_RECTS):
    crop_unity_sprite(BIRD_SOURCE, f"bird/fly-{index:02d}.png", *rect)

# The supplied alternate hero uses the same 14-frame / 24 FPS controller.
BLUE_BIRD_SOURCE = "Animations/Skin Animations/01 - BlueBert/bert2.png"
BLUE_BIRD_RECTS = [
    (0, 351, 179, 161), (179, 351, 179, 161), (358, 351, 179, 161),
    (537, 351, 179, 161), (716, 351, 179, 161), (0, 190, 179, 161),
    (179, 190, 179, 161), (358, 190, 179, 161), (537, 190, 179, 161),
    (716, 190, 179, 161), (0, 29, 179, 161), (179, 29, 179, 161),
    (358, 29, 179, 161), (537, 29, 179, 161),
]
for index, rect in enumerate(BLUE_BIRD_RECTS):
    crop_unity_sprite(BLUE_BIRD_SOURCE, f"bird-blue/fly-{index:02d}.png", *rect)

# Level 2 is a packed NGUI atlas. These five source rectangles are copied
# verbatim so Tunnel Training uses the project artwork rather than Level 1.
LEVEL_TWO_SOURCE = "LevelAtlases/Level2/Level2.png"
LEVEL_TWO_LAYERS = {
    "bg-1": (0, 734, 1280, 921),
    "bg-2": (0, 1648, 1280, 2048),
    "fg": (0, 1121, 1280, 1323),
    "mg": (0, 922, 1280, 1120),
    "sky": (0, 1324, 1280, 1647),
}
for name, box in LEVEL_TWO_LAYERS.items():
    crop_top_left(LEVEL_TWO_SOURCE, f"levels/tunnel/{name}.png", box)

# Level 4's foreground is a layered transparent strip. Export the authored
# canopy, stone and ground sections separately so the browser can restore the
# original foreground depth instead of flattening everything behind enemies.
JUNGLE_FOREGROUND_SOURCE = "LevelAtlases/Level4/Textures/fg.png"
JUNGLE_FOREGROUND_PARTS = {
    "top-foreground": (0, 0, 1280, 120),
    "canopy-left": (105, 0, 730, 165),
    "canopy-right": (680, 0, 1280, 165),
    "stone-left": (215, 72, 350, 226),
    "stone-right": (790, 72, 910, 230),
    "ground": (0, 140, 1280, 310),
}
for name, box in JUNGLE_FOREGROUND_PARTS.items():
    crop_top_left(JUNGLE_FOREGROUND_SOURCE, f"levels/jungle/{name}.png", box)

# Original parallax layers.
for source, target in [
    ("LevelAtlases/Level1/Images/Level1_SKY.jpg", "levels/desert/sky.jpg"),
    ("LevelAtlases/Level1/Images/Level1_BG1.png", "levels/desert/bg-1.png"),
    ("LevelAtlases/Level1/Images/Level1_BG2.png", "levels/desert/bg-2.png"),
    ("LevelAtlases/Level1/Images/Level1_MG.png", "levels/desert/mg.png"),
    ("LevelAtlases/Level1/Images/Level1_FG.png", "levels/desert/fg.png"),
    ("LevelAtlases/Level3/Images/Sky.png", "levels/flappy/sky.png"),
    ("LevelAtlases/Level3/Images/Bg.png", "levels/flappy/bg.png"),
    ("LevelAtlases/Level3/Images/Mg.png", "levels/flappy/mg.png"),
    ("LevelAtlases/Level3/Images/Fg.png", "levels/flappy/fg.png"),
    ("LevelAtlases/Level4/Textures/bg.png", "levels/jungle/bg.png"),
    ("LevelAtlases/Level4/Textures/mg.png", "levels/jungle/mg.png"),
    ("LevelAtlases/Level4/Textures/fg.png", "levels/jungle/fg.png"),
    ("LevelAtlases/Level5/Textures/sky.png", "levels/happy-sky/sky.png"),
    ("LevelAtlases/Level5/Textures/bg.png", "levels/happy-sky/bg.png"),
    ("LevelAtlases/Level5/Textures/mg.png", "levels/happy-sky/mg.png"),
]:
    copy_asset(source, target)

# Original obstacle and collectible textures.
for source, target in [
    ("LevelAtlases/Level1/props/textures/Symbol 1.png", "props/desert-terrain.png"),
    ("LevelAtlases/Level3/Props/FlappyBertPipe.png", "props/flappy-pipe.png"),
    ("LevelAtlases/Level5/props/textures/rainbow_normal.png", "props/rainbow-normal.png"),
    ("LevelAtlases/Level5/props/textures/rainbow_colors.png", "props/rainbow-colors.png"),
    ("Sprites/PowerUps/star 1.png", "collectibles/star-sheet.png"),
    ("PowerupEffects/Effects/Glows/Materials/BlueGlow.png", "powerups/blue-glow.png"),
    ("PowerupEffects/Effects/Glows/Materials/WhiteGlow.png", "powerups/white-glow.png"),
    ("PowerupEffects/Effects/Glows/Materials/YellowGlow.png", "powerups/yellow-glow.png"),
    ("PowerupEffects/Effects/Magnet/Lightning.png", "powerups/lightning.png"),
    ("Animations/Skin Animations/00 - Bert/Feather.png", "particles/feather.png"),
    ("PowerupEffects/Effects/Shield/particles/shieldsplinter.png", "particles/shield-splinter.png"),
    ("PowerupEffects/Effects/Shield/particles/shieldsplinter_orange.png", "particles/shield-splinter-orange.png"),
]:
    copy_asset(source, target)

# Moving and mixed modes reuse the exact original pipe silhouette and lighting.
# The precomputed palettes keep them readable without costly per-frame filters.
tint_asset("LevelAtlases/Level3/Props/FlappyBertPipe.png", "props/flappy-pipe-blue.png", "#061b45", "#59e5ff")
tint_asset("LevelAtlases/Level3/Props/FlappyBertPipe.png", "props/flappy-pipe-gold.png", "#4d2100", "#ffe66b")

# Happy Sky's authored pipe characters live in the layered props atlas.
HAPPY_PIPE_SOURCE = "LevelAtlases/Level5/props/textures/props.psd"
HAPPY_PIPE_SPRITES = {
    "pipe-purple-top": (3, 788, 153, 45),
    "pipe-yellow-top": (158, 788, 153, 45),
    "pipe-blue-top": (313, 788, 153, 45),
    "pipe-red-top": (468, 788, 153, 45),
    "pipe-green-top": (623, 788, 153, 45),
    "pipe-purple": (15, 439, 129, 349),
    "pipe-yellow": (170, 439, 129, 349),
    "pipe-blue": (325, 439, 129, 349),
    "pipe-red": (480, 439, 129, 349),
    "pipe-green": (635, 439, 129, 349),
    "eye-left": (805, 773, 48, 50),
    "eye-right": (853, 773, 48, 50),
    "eye-left-closed": (805, 651, 48, 20),
    "eye-right-closed": (853, 651, 48, 20),
    "mouth-1": (829, 597, 39, 18),
    "mouth-2": (829, 581, 39, 16),
    "mouth-3": (829, 564, 39, 17),
}
for name, rect in HAPPY_PIPE_SPRITES.items():
    crop_unity_sprite(HAPPY_PIPE_SOURCE, f"props/happy-pipe/{name}.png", *rect)

# Original powerup pickup/effect sprites from the layered Unity PSD. The
# prefab mappings are Shield=1, Magnet=3, Focus=6, with sprite 0 as the wing
# shared by Shield and Magnet and sprite 4 as the orbiting shield charge.
POWERUP_SOURCE = "PowerupEffects/PowerUpSprites.psd"
POWERUP_SPRITES = {
    "wing": (38, 424, 98, 77),
    "shield-pickup": (39, 307, 85, 105),
    "magnet-pickup": (35, 205, 91, 91),
    "shield-charge": (37, 107, 80, 80),
    "focus-pickup": (133, 41, 91, 91),
}
for name, rect in POWERUP_SPRITES.items():
    crop_unity_sprite(POWERUP_SOURCE, f"powerups/{name}.png", *rect)

# Effect-specific clips used by the original Shield and Magnet lifecycles.
for source, target in [
    ("PowerupEffects/Effects/Magnet/sfx/pwr_up.wav", "audio/magnet-up.wav"),
    ("PowerupEffects/Effects/Magnet/sfx/pwr_running.wav", "audio/magnet-running.wav"),
    ("PowerupEffects/Effects/Magnet/sfx/pwr_down.wav", "audio/magnet-down.wav"),
    ("PowerupEffects/Effects/Shield/sfx/ShieldOn.wav", "audio/shield-on.wav"),
    ("PowerupEffects/Effects/Shield/sfx/ShieldBreak.wav", "audio/shield-break.wav"),
    ("PowerupEffects/Effects/Shield/sfx/ShieldOff.wav", "audio/shield-off.wav"),
]:
    copy_asset(source, target)

# Star's first Unity sprite and the complete Jungle enemy sequences used by
# the original prefab controllers. Spider Catch is an 18-frame web/cocoon
# sequence at 8 FPS. Snake Catch is the three-frame Bert capture sequence.
crop_top_left("Sprites/PowerUps/star 1.png", "collectibles/star.png", (0, 0, 128, 128))

SPIDER_SOURCE = "LevelAtlases/Level4/Props/Textures/Spider+3.png"
SPIDER_IDLE_RECTS = [
    (0, 936, 124, 87), (124, 936, 124, 87), (248, 936, 124, 87),
]
for index, rect in enumerate(SPIDER_IDLE_RECTS):
    crop_unity_sprite(SPIDER_SOURCE, f"props/spider-{index:02d}.png", *rect)

SPIDER_CATCH_RECTS = [
    (372, 958, 125, 66), (0, 869, 125, 66), (125, 869, 125, 66),
    (250, 855, 125, 80), (375, 845, 120, 90), (0, 759, 120, 85),
    (120, 758, 120, 86), (240, 753, 120, 91), (360, 753, 120, 91),
    (0, 659, 120, 94), (120, 659, 120, 94), (240, 656, 120, 97),
    (360, 631, 120, 122), (0, 470, 120, 160), (120, 469, 120, 161),
    (240, 470, 120, 160), (360, 471, 120, 159), (1, 319, 121, 148),
]
for index, rect in enumerate(SPIDER_CATCH_RECTS):
    crop_unity_sprite(SPIDER_SOURCE, f"props/spider-catch-{index:02d}.png", *rect)

SNAKE_SOURCE = "LevelAtlases/Level4/Props/Textures/AnimationSnake+15.png"
SNAKE_IDLE_RECTS = [
    (0, 904, 76, 119), (76, 901, 76, 122), (152, 901, 76, 122),
    (228, 901, 76, 122), (304, 908, 75, 115), (0, 779, 76, 117),
    (76, 790, 81, 106),
]
for index, rect in enumerate(SNAKE_IDLE_RECTS):
    crop_unity_sprite(SNAKE_SOURCE, f"props/snake-{index:02d}.png", *rect)

SNAKE_JUMP_RECTS = [
    (76, 790, 81, 106), (158, 732, 95, 164), (253, 694, 104, 203),
    (357, 656, 131, 241), (0, 384, 127, 272),
]
for index, rect in enumerate(SNAKE_JUMP_RECTS):
    crop_unity_sprite(SNAKE_SOURCE, f"props/snake-jump-{index:02d}.png", *rect)

SNAKE_CATCH_RECTS = [
    (1, 189, 195, 172), (198, 261, 184, 99), (383, 281, 110, 78),
]
for index, rect in enumerate(SNAKE_CATCH_RECTS):
    crop_unity_sprite(SNAKE_SOURCE, f"props/snake-catch-{index:02d}.png", *rect)

# Original NGUI interface artwork and fonts used by the premium browser shell.
for source, target in [
    ("GUI/Atlas/Textures/GameTitle.png", "ui/game-title.png"),
    ("GUI/Atlas/Textures/MenuBird.png", "ui/menu-bird.png"),
    ("GUI/Atlas/Textures/MainMenu_Play.png", "ui/menu-play.png"),
    ("GUI/Atlas/Textures/MainMenu_QuickPlay.png", "ui/menu-quick-play.png"),
    ("GUI/Atlas/Textures/MainMenu_Settings.png", "ui/menu-settings.png"),
    ("GUI/Atlas/Textures/LevelMenu_mainmenu.png", "ui/level-main-menu.png"),
    ("GUI/Atlas/Textures/Button_Again.png", "ui/button-again.png"),
    ("GUI/Atlas/Textures/Button_Change_Level.png", "ui/button-change-level.png"),
    ("GUI/Atlas/Textures/Button_Leaderboards.png", "ui/button-leaderboards.png"),
    ("GUI/Atlas/Textures/newScore.png", "ui/scoreboard.png"),
    ("GUI/Atlas/Textures/New_Highscore.png", "ui/new-highscore.png"),
    ("GUI/Atlas/Textures/Leaderboard_Crown.png", "ui/crown.png"),
    ("GUI/Atlas/Textures/Stopwatch.png", "ui/stopwatch.png"),
    ("GUI/Atlas/Textures/MenuStar.png", "ui/menu-star.png"),
    ("GUI/Atlas/Textures/MainMenu_leaderboards.png", "ui/menu-leaderboards.png"),
    ("GUI/Atlas/Textures/Leaderboard_Score.png", "ui/leaderboard-score.png"),
    ("GUI/Atlas/Textures/Leaderboard_streak.png", "ui/leaderboard-streak.png"),
    ("GUI/Atlas/Textures/Leaderboard_Time.png", "ui/leaderboard-time.png"),
    ("GUI/Atlas/Textures/Leaderboard_World.png", "ui/leaderboard-world.png"),
    ("GUI/Atlas/Textures/Leaderboard_Friends.png", "ui/leaderboard-friends.png"),
    ("GUI/Atlas/Textures/leaderboard_result_bg1.png", "ui/leaderboard-row-1.png"),
    ("GUI/Atlas/Textures/leaderboard_result_bg2.png", "ui/leaderboard-row-2.png"),
    ("GUI/Atlas/Textures/Chest.png", "ui/chest.png"),
    ("GUI/Atlas/Textures/wallet_star.png", "ui/wallet-star.png"),
    ("GUI/Atlas/Textures/item_player_preview_bert.png", "ui/player-bert.png"),
    ("GUI/Atlas/Textures/item_player_preview_tweert.png", "ui/player-tweert.png"),
    ("GUI/Atlas/Textures/item_player_preview_pig.png", "ui/player-pig.png"),
    ("GUI/Atlas/Textures/Level1.png", "ui/level-1.png"),
    ("GUI/Atlas/Textures/Level2.png", "ui/level-2.png"),
    ("GUI/Atlas/Textures/Level3.png", "ui/level-3.png"),
    ("GUI/Atlas/Textures/Level4.png", "ui/level-4.png"),
    ("GUI/Atlas/Fonts/Full House/fullhouse.TTF", "fonts/fullhouse.ttf"),
    ("GUI/Atlas/Fonts/Arial Rounded/Arial Rounded.TTF", "fonts/arial-rounded.ttf"),
]:
    copy_asset(source, target)

for icon_size in (192, 512):
    create_pwa_icon(icon_size)

create_level_five_preview()
create_stream_audio("Sounds/Music/Chopin.wav", "audio/chopin.mp3")
create_stream_audio("Sounds/Music/Level1.wav", "audio/level-1.mp3")
create_stream_audio("Sounds/Music/Menu.wav", "audio/menu.mp3")
create_stream_audio("Sounds/Music/Test.wav", "audio/tunnel.mp3")

print(f"Exported Unity web assets to {OUTPUT}")
