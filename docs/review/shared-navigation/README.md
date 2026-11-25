# Shared research navigation review

The 25 linked HTML destinations and the main desk use one header source in
`_includes/research-header.html` and one stylesheet in `research-header.css`.
Run `python scripts/sync_research_header.py` after editing the shared header.
The expansion is checked in so Pages and plain static previews serve the same
markup. Relative targets resolve under the existing Pages project path.
The desk keeps its existing Research Pages disclosure because it also exposes
the desk's interactive views. The other pages use native HTML disclosures.

## Baseline inventory

| Page | New header? | Direct desk link? | Old style? |
| --- | --- | --- | --- |
| Research desk and its query views | Tennis variant | Yes | Mixed |
| Analyst Terminal | No | Yes | Yes |
| CRICFy Browser Lab | No | No | Yes |
| Darts | No | Yes | Yes |
| Fixture evidence | No | Yes | Yes |
| Football league research | No | Yes | Yes |
| Football Match Centre | No | Yes | Yes |
| Legacy dashboard | No | Yes | Yes |
| Market Intelligence | No | Yes | Yes |
| Operations | No | Yes | Yes |
| Paper Lab | No | Yes | Yes |
| Racing analysis desk | No | No | Yes |
| Context Racing Lab | No | Yes | Yes |
| Horse Racing Lab | No | Yes | Yes |
| Horse advice board | No | Yes | Yes |
| Historical Reliability | No | No | Yes |
| Football Research Lab | No | Yes | Yes |
| Methodology / Research Overview | No | Yes | Yes |
| Report archive | No | Yes | Yes |
| Archived racing model comparison | No | No | Yes |
| Rugby | No | Yes | Yes |
| Sports Watch | No | Yes | Yes |
| Track Record | No | Yes | Yes |
| Racing V3 Lab | No | Yes | Yes |
| Validation Centre | No | Yes | Yes |
| Gold Council | No | Yes | Yes |

The Paper Lab README is a linked document outside the HTML page inventory.

## Verification

- Browser navigation passed on all 26 routes at 1440 px and 390 px. Both
  return links resolved to the project root and browser Back restored
  the page on all 25 destinations. Each menu included the destination index.
- The existing Paper Lab inline bootstrap produces a Content Security Policy
  console error at both sizes. The same error was reproduced on the live
  baseline. The bootstrap and policy were left intact.
- The browser environment needed its local TLS workaround for the Operations
  page's external requests. With that workaround the page logged no errors.
- The JS and Python regression and the existing research browser suite passed.
