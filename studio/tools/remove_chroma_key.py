#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "pillow",
# ]
# ///
"""Remove a solid chroma-key background from an image and write alpha PNG/WebP."""

from __future__ import annotations

import argparse
from pathlib import Path
import re
from statistics import median
import sys
from typing import Tuple


Color = Tuple[int, int, int]


def die(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


def load_pillow():
    try:
        from PIL import Image
    except ImportError as error:
        die(f"Pillow is required. Run with uv run --script studio/tools/remove_chroma_key.py. {error}")
    return Image


def parse_color(raw: str) -> Color:
    match = re.fullmatch(r"#?([0-9a-fA-F]{6})", raw.strip())
    if not match:
        die("Key color must be a hex RGB value like #00ff00.")
    value = match.group(1)
    return int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)


def channel_distance(a: Color, b: Color) -> int:
    return max(abs(a[0] - b[0]), abs(a[1] - b[1]), abs(a[2] - b[2]))


def clamp(value: float) -> int:
    return max(0, min(255, int(round(value))))


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def sample_border_key(image) -> Color:
    width, height = image.size
    pixels = image.load()
    samples: list[Color] = []
    band = max(1, min(width, height, 6))
    step = max(1, min(width, height) // 256)

    for x in range(0, width, step):
        for y in range(band):
            samples.append(pixels[x, y][:3])
            samples.append(pixels[x, height - 1 - y][:3])
    for y in range(0, height, step):
        for x in range(band):
            samples.append(pixels[x, y][:3])
            samples.append(pixels[width - 1 - x, y][:3])

    if not samples:
        die("Could not sample key color from image border.")
    return (
        int(round(median(sample[0] for sample in samples))),
        int(round(median(sample[1] for sample in samples))),
        int(round(median(sample[2] for sample in samples))),
    )


def soft_alpha(distance: int, transparent_threshold: float, opaque_threshold: float) -> int:
    if distance <= transparent_threshold:
        return 0
    if distance >= opaque_threshold:
        return 255
    ratio = (distance - transparent_threshold) / (opaque_threshold - transparent_threshold)
    return clamp(255.0 * smoothstep(ratio))


def spill_channels(key: Color) -> list[int]:
    key_max = max(key)
    if key_max < 128:
        return []
    return [index for index, value in enumerate(key) if value >= key_max - 16 and value >= 128]


def despill(rgb: Color, key: Color) -> Color:
    channels = [float(value) for value in rgb]
    keyed = spill_channels(key)
    keep = [index for index in range(3) if index not in keyed]
    if not keep:
        return rgb
    cap = max(0.0, max(channels[index] for index in keep) - 1.0)
    for index in keyed:
        channels[index] = min(channels[index], cap)
    return clamp(channels[0]), clamp(channels[1]), clamp(channels[2])


def remove_key(args: argparse.Namespace) -> None:
    Image = load_pillow()
    input_path = Path(args.input)
    output_path = Path(args.out)
    if not input_path.exists():
        die(f"Input image not found: {input_path}")
    if output_path.exists() and not args.force:
        die(f"Output already exists: {output_path}")
    if output_path.suffix.lower() not in {".png", ".webp"}:
        die("--out must end in .png or .webp.")

    with Image.open(input_path) as source:
        image = source.convert("RGBA")
    key = sample_border_key(image) if args.auto_key == "border" else parse_color(args.key_color)
    pixels = image.load()
    width, height = image.size
    transparent = 0

    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            rgb = (red, green, blue)
            distance = channel_distance(rgb, key)
            output_alpha = (
                soft_alpha(distance, args.transparent_threshold, args.opaque_threshold)
                if args.soft_matte
                else (0 if distance <= args.tolerance else 255)
            )
            output_alpha = int(round(output_alpha * (alpha / 255.0)))
            if output_alpha == 0:
                pixels[x, y] = (0, 0, 0, 0)
                transparent += 1
            else:
                if args.despill and distance < args.opaque_threshold:
                    red, green, blue = despill(rgb, key)
                pixels[x, y] = (red, green, blue, output_alpha)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path, "PNG" if output_path.suffix.lower() == ".png" else "WEBP")
    print(f"Wrote {output_path}")
    print(f"Key color: #{key[0]:02x}{key[1]:02x}{key[2]:02x}")
    print(f"Transparent pixels: {transparent}/{width * height}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Remove a flat chroma-key background.")
    parser.add_argument("--input", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--key-color", default="#00ff00")
    parser.add_argument("--tolerance", type=int, default=12)
    parser.add_argument("--auto-key", choices=["none", "border"], default="none")
    parser.add_argument("--soft-matte", action="store_true")
    parser.add_argument("--transparent-threshold", type=float, default=12.0)
    parser.add_argument("--opaque-threshold", type=float, default=96.0)
    parser.add_argument("--despill", action="store_true")
    parser.add_argument("--force", action="store_true")
    return parser


def main() -> None:
    remove_key(build_parser().parse_args())


if __name__ == "__main__":
    main()
