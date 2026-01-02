# Tasks

## Teams

- Teams should be dynamic and not configured hard-coded (currently 8) in the code
  - The teams amount is specified in the portal web ui and the amount of players in a team 
  can vary from 0 to N
  - teams are filled in ascending order by the game
  - if there aren't enough players for the defined teams, the latter teams will remain unused/empty
  - the strings for the ui should hold up to 100 teams