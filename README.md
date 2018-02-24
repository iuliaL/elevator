# Elevator

Features:

- 6 floors
- each floor has a panel with 2 buttons up/down
- inside elevator panel 0 -> 6
- status logger (next floor, going up, going down)
- time floor to floor 3 seconds
- the lift should stop if requested for same direction on its way to target floor
- the lift favours direction vs requests chronology

## TODO

- solve case when calling elevator for the same floor as the current one
- error now "console.error('We shouldn`t have arrived here in the 1st place, because there is no next target');"

- rewrite decideNextTarget fn (it's horrible)
- take requests from the outside (now taking just from inside)
- add door opening and closing visual feedback
- simulate elevator translation between floors