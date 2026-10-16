# Taxi partnerships and restaurant capacity

Three ivory taxis with roof signs and checker stripes drive on the existing road
network. Gino, Ada and Paolo are stable driver identities across generated maps.
Tap a visible taxi to speak with its driver. The selected taxi waits during the
conversation. Dragging the map does not open a contract.

Contracts last 7, 30 or 365 game days. The daily base price is 60 DM, with 0%,
20% or 40% discounts respectively: 420 DM, 1,440 DM or 13,140 DM paid once.
Each driver can recommend only one owned restaurant at a time. Contracts expire
automatically without recurring charges. They persist in the optional version-1
`taxis` field of the existing version-13 save; earlier saves start with no contracts.
Invalid driver IDs, duplicate active drivers, forged prices and invalid dates are
discarded on restore. Duplicate submission and insufficient funds are atomic.

A driver adds 20% recommendation weight for all three customer tiers of the
selected restaurant, capped at 60% for all three drivers. This acts alongside
advertising in the existing finite district market. It does not create an infinite
guest supply or bypass kitchen, menu, shifts, debts, seating or meal budgets.
Upfront fees are included in the restaurant's advertising and operating costs and
in the daily report on the signing day. Exact expiry is a service-clock boundary.

The restaurant header opens a capacity view. Every advertising quote and taxi
restaurant selection also has the same planning card:

* Green: existing demand that can be served.
* Amber: additional demand from this specific offer that can be served.
* Striped red: demand exceeding the restaurant's estimated handling capacity.

The 100% marker is fixed to capacity; the scale expands when demand exceeds it.
Current seating and waiting orders appear separately from the planning estimate.
Closed or unprepared restaurants show zero capacity and a reason. Fully loaded
restaurants show a warning instead of implying additional served guests. Players
can still buy a long contract in anticipation of expanding the business.

Capacity is an estimate, not a second service simulator or a revenue promise. It
uses reachable tables, the real kitchen workflow, employee skills and walking
speed factors, preparation and baking times, delivery and clearing paths, typical
party sizes and the actual lunch/evening roster. It takes the minimum handling
rate of the kitchen crew, matched oven/transfer workflow, service, table turnover
and arrival cadence in each staffed shift. Extra unused devices are not assumed
to improve a workflow that does not use them. A cached calculation is invalidated
by furniture, kitchen tiles, roster/skills, opening, menu or relevant debt changes.
Forecasts never mutate guests, finances, daily ledgers or the district pool.

Validation: `tests/pizza-taxis-capacity-qa.mjs` and
`tests/pizza-taxis-capacity-browser-qa.cjs`, plus the advertising, daily ledger,
market, city and main responsive regressions.
