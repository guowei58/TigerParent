"""Combine numbered PNGs into a single high-resolution PDF."""
import re
import sys
import tempfile
from pathlib import Path

import img2pdf
from PIL import Image, ImageFilter

INPUT_DIR = Path(r"C:\Users\admin\Downloads\5th grade math NY1 - Problem-Attic_files")
OUTPUT_PDF = Path(r"C:\Users\admin\Desktop\TigerParent\PracticeProblems\5th_grade_math_NY1_Problem-Attic.pdf")

# Letter-width at 300 DPI. Source PNGs are ~350px Problem-Attic preview thumbnails.
TARGET_WIDTH_PX = 2550
DPI = 300


def sort_key(path: Path) -> int:
    m = re.search(r"image_(\d+)", path.stem, re.I)
    if not m:
        raise ValueError(f"Unexpected filename: {path.name}")
    return int(m.group(1))


def upscale_page(img: Image.Image) -> Image.Image:
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    scale = TARGET_WIDTH_PX / img.width
    new_size = (TARGET_WIDTH_PX, max(1, round(img.height * scale)))
    upscaled = img.resize(new_size, Image.Resampling.LANCZOS)
    # Light sharpen to improve readability after upscaling tiny previews.
    return upscaled.filter(ImageFilter.UnsharpMask(radius=1.2, percent=140, threshold=2))


def main() -> None:
    files = sorted(INPUT_DIR.glob("image_*.png"), key=sort_key)
    if not files:
        print("No PNG files found in", INPUT_DIR)
        sys.exit(1)

    print(f"Found {len(files)} images")
    print(f"First: {files[0].name}, last: {files[-1].name}")

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        page_paths: list[Path] = []

        for i, f in enumerate(files, 1):
            with Image.open(f) as img:
                page = upscale_page(img)
                out = tmp / f"page_{i:05d}.png"
                page.save(out, format="PNG", optimize=False)
                page_paths.append(out)

            if i % 50 == 0 or i == len(files):
                print(f"  upscaled {i}/{len(files)} -> {page.size[0]}x{page.size[1]} px")

        OUTPUT_PDF.parent.mkdir(parents=True, exist_ok=True)
        layout = img2pdf.get_layout_fun((img2pdf.mm_to_pt(215.9), img2pdf.mm_to_pt(279.4)))
        pdf_bytes = img2pdf.convert(
            [str(p) for p in page_paths],
            layout_fun=layout,
            dpi=DPI,
        )
        OUTPUT_PDF.write_bytes(pdf_bytes)

    size_mb = OUTPUT_PDF.stat().st_size // 1024 // 1024
    print(f"Wrote {OUTPUT_PDF} ({size_mb} MB, {DPI} DPI target width {TARGET_WIDTH_PX}px)")
    print(
        "Note: source PNGs are 350px Problem-Attic preview thumbnails; "
        "for best quality, export the PDF directly from Problem-Attic."
    )


if __name__ == "__main__":
    main()
