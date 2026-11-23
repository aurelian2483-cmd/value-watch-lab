# Tennis indicator audit

Compared the public homepage HTML with current main and checked the existing renderer, the default desk stylesheet, and the Tennis variant. The original source text and source/status logic remain in place.

| Indicator | Main | PR #144 before follow-up | Still distinguishable before? | Follow-up |
| --- | --- | --- | --- | --- |
| Current Engine 2.5 | Named option and status in the shared blue engine card | Named option and status in the navy card | Yes, by text | Blue engine-status accent |
| Experimental 3.0 | Named option and research status | Same words, shared navy treatment | Yes, by text | Violet engine-status accent |
| Hybrid 3.1 | Named option and research status | Same words, shared navy treatment | Yes, by text | Teal engine-status accent |
| Side-by-Side Compare | Named option and comparison text | Same words, shared navy treatment | Yes, by text | Amber engine-status accent |
| Historical Reliability | Named option and research-only status | Same words, shared navy treatment | Yes, by text | Rose engine-status accent |
| Model estimate | Figure and model estimate caption | Green figure, original caption | Yes, by text | Blue figure and caption |
| Source price | Source or bookmaker caption, market receipt and observation time where available | Same labels; no matched bookmaker-price state in the published tennis snapshot | Yes, where sourced | Matched-price class uses teal; existing receipt and source labels retained |
| EV withheld | Fixture note and available evidence details | Same note with shared muted colour | Yes, by text | Amber note on the tennis model row |
| No verified price / unavailable | Fixture or market-level note, disabled selection where applicable | Same note and disabled state | Yes, by text | Muted label and dashed disabled border |
| UNVALIDATED | Research header, model note, engine and expanded evidence | Same text | Yes, by text | Violet fixture note on the tennis model row |
| PAPER | Slip heading badge | Same text | Yes, by text | Gold badge |
| IN THIS SLIP / selected | Caption, selected button and pressed state | Caption and green selection border | Yes | Green selected caption and original pressed state |
| Weekly Wildcard | Existing card and review controls near the end of slips | Still present but below the slip content | No, at the top of the visible panel | Existing card before tabs, gold styling, and links in the header, Research Pages and rail |
