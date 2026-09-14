"""Reassign product imagery to clean, white-background catalogue shots.

Every non-book product is pinned to one dummyjson *subject* - a distinct real
product, not another angle of one already used. Each subcategory declares a
preference pool; the assignment then picks the least globally-used subject in
that pool, so imagery spreads instead of clumping. Two rules it enforces and
asserts:
  1. No subject repeats inside a subcategory.
  2. No subject appears on more than MAX_USES cards anywhere - three
     differently-named products showing one photograph is the thing that reads
     as broken, whichever photograph it is.
Books keep their real Open Library jackets.
"""
import json, re, collections

# Source listing, fetched once:
#   curl -s "https://dummyjson.com/products?limit=200&select=title,category,images" -o dj.json
HERE = __import__("os").path.dirname(__import__("os").path.abspath(__file__))
DJ = json.load(open(HERE + "/dj.json"))["products"]
BY_ID = {p["id"]: p for p in DJ}
MAX_USES = 2
MIN_GAP = 10  # cards between two uses of one subject in the default listing

# subcategory -> preference pool of dummyjson product ids, closest match first.
# Pools are deliberately wider than the subcategory needs so the balancer has
# room to avoid reusing a subject that is already on screen elsewhere.
PICKS = {
    # Beauty - bottles, tubes and compacts, all shot on white.
    "Bath & Body":      [118, 119, 120, 10, 9, 3, 5],
    "Haircare":         [6, 7, 8, 9, 10, 119, 1, 3],
    "Makeup":           [1, 2, 3, 4, 5],
    "Skincare":         [120, 118, 119, 10, 8, 6, 7, 9, 2, 3, 4, 5],
    # Clothing - flat garment shots.
    # dummyjson has exactly five men's-shirt subjects and ten dresses, and no
    # jeans, hoodies, socks or underwear at all. The five shirts have ten slots
    # at MAX_USES, and they go to the menswear basics - t-shirts, shirts, jeans,
    # socks, trunks - because a plain shirt on white next to "511 Slim Fit
    # Jeans" reads as a catalogue stand-in, where a ballgown reads as a bug.
    # Hoodies and the women's-leaning lines take the dresses; they stay clean
    # single-product shots, which is the bar this is held to.
    "T-Shirts":         [84, 86, 83, 87, 85],
    "Shirts":           [85, 87, 83, 86, 84],
    "Jeans":            [83, 85, 87, 86, 84],
    "Socks":            [86, 84, 83],
    "Underwear":        [84, 86, 83],
    "Hoodies":          [162, 163, 164, 165, 166],
    "Activewear":       [177, 178, 179, 164, 166],
    "Jackets":          [181, 180, 179, 178],
    # Electronics.
    "Accessories":      [108, 105, 109, 111, 106],
    "Chargers":         [104, 102, 105, 108],
    "Headphones":       [100, 101, 107, 99, 103, 106],
    "Networking":       [102, 112, 99, 103],
    "Smart Home":       [112, 110, 106, 99, 103, 109],
    "Speakers":         [99, 103, 110, 112],
    "Storage":          [105, 108, 102, 111, 109],
    "Tablets":          [159, 160, 161],
    # Home & Kitchen.
    "Bedding":          [11, 13, 12, 14],
    "Cleaning":         [75, 63, 57, 60, 50, 70],
    "Cookware":         [68, 52, 71, 66, 56],
    "Small Appliances": [51, 56, 66, 61, 54, 49, 67],
    "Tableware":        [69, 59, 67, 74, 58, 64, 49],
    # Sports.
    "Cricket":          [143, 144, 142],
    "Football":         [147, 137, 89, 140, 153],
    "Gym Equipment":    [172, 175, 139, 144, 141, 173, 176, 150],
    "Running":          [88, 90, 91, 92, 89],
    "Swimming":         [177, 154, 178, 155],
    "Tennis":           [152, 151, 146, 149, 148],
    "Yoga":             [165, 166, 179, 53],
}
# "Storage" exists in both Electronics and Home & Kitchen; the kitchen one
# needs containers, not phone accessories.
PICKS_BY_CAT = {("Home & Kitchen", "Storage"): [73, 65, 62, 75, 59]}

path = HERE + "/../lib/data/products.ts"
src = open(path).read()
blocks = re.findall(r'\{\s*id: "p\d+".*?\n  \},', src, re.S)
assert len(blocks) == 120, len(blocks)
field = lambda b, k: (re.search(k + r': "([^"]*)"', b) or [None, None])[1]

# Assign the scarcest subcategories first, so a pool with little slack is not
# left picking from subjects the roomy ones already spent. Within that, prefer
# the least-used subject and then the one used furthest back in listing order -
# a subject may legitimately appear twice, but not twice in one screenful.
rows = [(b, field(b, "category"), field(b, "subcategory")) for b in blocks]
position = {field(b, "id"): i for i, (b, _, _) in enumerate(rows)}
groups = collections.defaultdict(list)
for b, cat, sub in rows:
    if cat != "Books":
        groups[(cat, sub)].append(b)
slack = lambda k: len(PICKS_BY_CAT.get(k) or PICKS[k[1]]) - len(groups[k])
order = sorted(groups, key=slack)

uses = collections.Counter()
last_at = {}
chosen = {}
for key in order:
    pool = PICKS_BY_CAT.get(key) or PICKS[key[1]]
    taken = set()
    for b in groups[key]:
        here = position[field(b, "id")]
        cands = [i for i in pool if i not in taken]
        assert cands, f"{key} has more products than picked subjects"
        # A subject may appear twice, but not twice in one screenful: treat
        # anything closer than MIN_GAP cards as a last resort.
        def rank(i):
            gap = abs(here - last_at.get(i, 10 ** 6))
            return (uses[i], 0 if gap >= MIN_GAP else 1, -gap, pool.index(i))
        best = min(cands, key=rank)
        taken.add(best); uses[best] += 1; last_at[best] = here
        chosen[field(b, "id")] = best

# The pools are saturated in places - twenty clothing products draw on fifteen
# garment subjects, so some subject must appear twice. Greedy assignment gets
# the counts right but can leave both uses in one screenful, so hill-climb:
# swap two products' subjects whenever that pushes the closest repeat apart.
# A swap only ever exchanges subjects between products, so the per-subcategory
# distinctness and the MAX_USES counts established above are preserved.
def gaps(assign):
    at = collections.defaultdict(list)
    for pid, subj in assign.items():
        at[subj].append(position[pid])
    return sorted(min(b - a for a, b in zip(sorted(v), sorted(v)[1:]))
                  for v in at.values() if len(v) > 1)

sub_of = {field(b, "id"): (cat, sub) for b, cat, sub in rows if cat != "Books"}
ids = list(chosen)
for _ in range(400):
    before = gaps(chosen)
    improved = False
    for x in ids:
        for y in ids:
            if x == y or sub_of[x] == sub_of[y]:
                continue
            px = PICKS_BY_CAT.get(sub_of[x]) or PICKS[sub_of[x][1]]
            py = PICKS_BY_CAT.get(sub_of[y]) or PICKS[sub_of[y][1]]
            if chosen[y] not in px or chosen[x] not in py:
                continue
            # Neither product may land on a subject already used by a sibling.
            if any(chosen[o] == chosen[y] for o in ids
                   if o != x and sub_of[o] == sub_of[x]):
                continue
            if any(chosen[o] == chosen[x] for o in ids
                   if o != y and sub_of[o] == sub_of[y]):
                continue
            chosen[x], chosen[y] = chosen[y], chosen[x]
            if gaps(chosen) > before:
                before = gaps(chosen); improved = True
            else:
                chosen[x], chosen[y] = chosen[y], chosen[x]
    if not improved:
        break
print("closest repeat is now %d cards apart" % (gaps(chosen)[0] if gaps(chosen) else 999))

final = collections.Counter(chosen.values())
over = [(BY_ID[i]["title"], n) for i, n in final.items() if n > MAX_USES]
assert not over, f"subject reused more than {MAX_USES}x: {over}"

out, changed = src, 0
for b, cat, sub in rows:
    if cat == "Books":
        continue
    dj = BY_ID[chosen[field(b, "id")]]
    imgs = [u for u in dj["images"] if u.startswith("https://cdn.dummyjson.com/")]
    assert imgs, dj["title"]
    nb = re.sub(r'image: "[^"]*"', 'image: "%s"' % imgs[0], b, count=1)
    nb = re.sub(r'images: \[[^\]]*\]',
                "images: [" + ", ".join('"%s"' % u for u in imgs) + "]", nb, count=1)
    if nb != b:
        out = out.replace(b, nb, 1); changed += 1
open(path, "w").write(out)
print("rewrote %d products; %d distinct subjects; max reuse %d"
      % (changed, len(uses), max(uses.values())))
