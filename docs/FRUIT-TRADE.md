# Bellafrutta and the park fruit carts

This is a fictional, coded game economy. The goods are the invented game items
Kokosnuss, Einhorn and Grüner Waldmeister, not real substances or real prices.

Dial `551204` manually at any telephone booth. The wholesaler is listed in the
phone book. The conversation opens the catalog only after suitable, understated
dialogue choices. Asking explicitly for drugs immediately ends the call with
"Keine Macht den Drogen. Wir verkaufen Obst. Wiederhören." No purchase is made.
A polite negotiation grants 8% off the displayed daily wholesale prices.

Base prices are 2,200 / 650 / 150 DM per crate. Quotes vary deterministically by
game day, independently of the city seed. Orders contain 1 to 5 crates; the
wholesaler supplies at most 10 per day and the player can carry 30 total. Prices
and quantities are shown before payment. A quote crossing midnight must be
reviewed again before it can be charged.

Carlo visits a park from 13:00 to 16:00 except every third day's second day.
Marta visits from 18:00 to 22:00 except every third day's first day. Their two
clear garden sites are generated with the city. Invisible carts cannot be
clicked. Contacts and the inventory show locations and hours.

Each buyer has deterministic daily prices, 2 to 5 crates of demand per product
and 15,000 DM cash per game day. Selling requires a present buyer, sufficient
owned stock, remaining demand and remaining buyer cash. Daily quotas, inventory,
receipts, acquisition cost and sale proceeds persist independently of map
randomization. Failed transactions change neither inventory nor cash.

One Waldmeister gift per game day can be offered at the skatepark after choosing
a competitor. The crate is consumed on both acceptance and refusal. The crew
accepts 55% of offers. An accepted gift creates the separate, gift-only
`doodle` job: no cash fee, 30-minute delay, 12% detection risk, 5,000 DM penalty,
6% competitor demand reduction for two hours. Ordinary paid graffiti remains
available separately. Acceptance is saved immediately, and a pending job keeps
its frozen outcome through reloads. Gift-only jobs cannot be commissioned through
the ordinary paid action controls. An optional version-1 fruit ledger extends
the existing version-13 save without resetting earlier restaurants or taxis.

Fruit purchases and sales are chain-level side-business expenses and revenue,
separate from restaurant sales. They appear in the daily chain totals, cost
details, immutable midnight snapshots and the lifetime chain result. Restaurant
filters exclude the side business. Buying stock is treated as a cash expense,
consistently with the game's prepaid advertising economy.

City generation also enforces different building models on every pair of direct
neighbors. The row packer checks the preceding model and each corner at both
ends. Its search retains two distinct ending models per geometric state.
Closed blocks, narrow passages, parcel boundaries and required business sites
are preserved. Validation checks both model packing and rendered cities.

Checks: fruit model/browser suites, underworld and taxi regressions, daily
accounting, 1,893 parcels across 128 layouts and the 32-city renderer regression.
