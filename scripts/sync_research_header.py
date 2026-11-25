"""Render the shared research header into the checked-in static HTML pages."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = (ROOT / "_includes/research-header.html").read_text(encoding="utf-8")
CURRENT = re.compile(r"@@CURRENT:([^@]+)@@")
START = "<!-- research-header:start -->"
END = "<!-- research-header:end -->"
BLOCK = re.compile(r"\n?" + re.escape(START) + r".*?" + re.escape(END) + r"\n?", re.S)
LEADING_SKIP = re.compile(r'\s*<a\b[^>]*\bclass="[^"]*\bskip(?:-link)?\b[^"]*"[^>]*>.*?</a>', re.S)


def render(page):
    """Keep existing assets and anchors intact, including on nested Pages paths."""
    path = ROOT / page
    source = BLOCK.sub("", path.read_bytes().decode("utf-8"), count=1)
    prefix = "../" * (len(Path(page).parts) - 1) or "./"
    header = CURRENT.sub(lambda match: ' aria-current="page"' if match[1] == page else "", TEMPLATE)
    header = header.replace("@@ROOT@@", prefix).rstrip()
    block = f'{START}\n<link rel="stylesheet" href="{prefix}research-header.css">\n{header}\n{END}'
    body = re.search(r"<body(?:\s[^>]*)?>", source, re.I)
    if body:
        position = body.end()
        skip = LEADING_SKIP.match(source, position)
        if skip:
            position = skip.end()
        return source[:position] + "\n" + block + "\n" + source[position:]

    # Some archives use an implicit HTML body. Insert before the original main content.
    main = re.search(r"<main(?:\s[^>]*)?>", source, re.I)
    if not main:
        raise ValueError(f"Cannot find the body or main element in {page}")
    return source[:main.start()] + block + "\n" + source[main.start():]


if __name__ == "__main__":
    for page in sorted(set(CURRENT.findall(TEMPLATE))):
        (ROOT / page).write_bytes(render(page).encode("utf-8"))
